import 'server-only';
import { addMember } from '@/lib/admin/member-standing';

// Joining a club with a code, and the admin tools the app's Club tab needs: the invite code,
// join requests, and posting a shift. Every function checks who is asking.

import { createAdminClient } from '@/lib/supabase/admin';
import { createShift } from '@/lib/admin/volunteer-service';
import { ukToday } from '@/lib/scores/context';
import type { ActionResult } from '@/lib/types/action';
import { getAdminClubIds } from './club-data';
import { newJoinCode, normaliseJoinCode, parseShiftInput } from './club-admin-logic';

const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/** The club this person runs. The app shows one club, so the first is used. */
async function adminClub(userId: string): Promise<string | null> {
  return (await getAdminClubIds(userId))[0] ?? null;
}

/* ── Invite code (admins) ──────────────────────────────────────────────────── */

export type ClubInvite = { clubName: string; code: string };

async function setNewCode(clubId: string): Promise<string | null> {
  const sb = createAdminClient();
  // A clash with another club's code is unlikely; try again a few times if it happens
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newJoinCode();
    const { error } = await sb.from('clubs').update({ join_code: code }).eq('id', clubId);
    if (!error) return code;
  }
  return null;
}

/** The club's join code, making one if the club does not have one yet. */
export async function getInvite(userId: string): Promise<ActionResult<ClubInvite>> {
  const clubId = await adminClub(userId);
  if (!clubId) return { success: false, error: 'Only club admins can invite members' };
  const { data } = await createAdminClient().from('clubs').select('name, join_code').eq('id', clubId).maybeSingle();
  if (!data) return { success: false, error: 'Club not found' };
  const code = (data.join_code as string | null) ?? (await setNewCode(clubId));
  if (!code) return { success: false, error: 'Could not make a join code. Please try again.' };
  return { success: true, data: { clubName: data.name as string, code } };
}

/** Replaces the join code, so the old one stops working. Requests already made are kept. */
export async function replaceInviteCode(userId: string): Promise<ActionResult<ClubInvite>> {
  const clubId = await adminClub(userId);
  if (!clubId) return { success: false, error: 'Only club admins can invite members' };
  const code = await setNewCode(clubId);
  if (!code) return { success: false, error: 'Could not make a join code. Please try again.' };
  const { data } = await createAdminClient().from('clubs').select('name').eq('id', clubId).maybeSingle();
  return { success: true, data: { clubName: (data?.name as string | undefined) ?? 'Your club', code } };
}

/* ── Asking to join (anyone signed in) ─────────────────────────────────────── */

export type JoinState = { state: 'none' } | { state: 'pending'; clubName: string } | { state: 'member'; clubName: string };

/** Whether this person is waiting on a join request. */
export async function getJoinState(userId: string): Promise<JoinState> {
  const sb = createAdminClient();
  const { data: request } = await sb
    .from('club_join_requests')
    .select('club_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!request) return { state: 'none' };
  const { data: club } = await sb.from('clubs').select('name').eq('id', request.club_id).maybeSingle();
  return { state: 'pending', clubName: (club?.name as string | undefined) ?? 'the club' };
}

/**
 * Asks to join the club with this code. The same answer is given for a wrong code however it is
 * wrong, so codes cannot be guessed at one character at a time.
 */
export async function requestToJoin(userId: string, rawCode: unknown): Promise<ActionResult<JoinState>> {
  const code = normaliseJoinCode(rawCode);
  if (!code) return { success: false, error: 'That code is not right. Codes are 6 letters and numbers.' };
  const sb = createAdminClient();
  const { data: club } = await sb.from('clubs').select('id, name').eq('join_code', code).maybeSingle();
  if (!club) return { success: false, error: 'No club has that code. Check it with your club admin.' };
  const clubName = club.name as string;

  const { data: member } = await sb
    .from('club_members')
    .select('id, is_active')
    .eq('club_id', club.id)
    .eq('user_id', userId)
    .maybeSingle();
  if (member?.is_active) return { success: true, data: { state: 'member', clubName } };

  const { error } = await sb
    .from('club_join_requests')
    .upsert({ club_id: club.id, user_id: userId }, { onConflict: 'club_id,user_id', ignoreDuplicates: true });
  if (error) return { success: false, error: 'Could not send your request. Please try again.' };
  return { success: true, data: { state: 'pending', clubName } };
}

/* ── Join requests in the approval queue (admins) ──────────────────────────── */

export type JoinRequest = { id: string; user_id: string; created_at: string };

export async function listJoinRequests(clubIds: string[]): Promise<JoinRequest[]> {
  if (clubIds.length === 0) return [];
  const { data } = await createAdminClient()
    .from('club_join_requests')
    .select('id, user_id, created_at')
    .in('club_id', clubIds);
  return (data ?? []) as JoinRequest[];
}

/** Approves or declines a join request. Approving makes the person a member with the player role. */
export async function decideJoinRequest(userId: string, requestId: string, approve: boolean): Promise<ActionResult<null>> {
  if (!isUuid(requestId)) return { success: false, error: 'Request not found' };
  const clubIds = await getAdminClubIds(userId);
  const sb = createAdminClient();
  const { data: request } = await sb.from('club_join_requests').select('id, club_id, user_id').eq('id', requestId).maybeSingle();
  if (!request || !clubIds.includes(request.club_id as string)) return { success: false, error: 'Request not found' };

  if (approve) {
    // Goes through the checked path: a lapsed member is switched back on keeping their role, a new one joins
    // as a player, and a date of birth under 18 marks them a junior. The change is audited.
    const added = await addMember({ actorId: userId }, request.club_id as string, request.user_id as string, 'player',
      'Join request approved', 'join_request');
    const error = added.success ? null : added.error;
    if (error) return { success: false, error: 'Could not add this member' };
  }
  await sb.from('club_join_requests').delete().eq('id', requestId);
  return { success: true, data: null };
}

/* ── Posting a shift (admins) ──────────────────────────────────────────────── */

export async function postShift(userId: string, body: unknown): Promise<ActionResult<{ id: string }>> {
  const clubId = await adminClub(userId);
  if (!clubId) return { success: false, error: 'Only club admins can post shifts' };
  const parsed = parseShiftInput(body, ukToday());
  if (!parsed.ok) return { success: false, error: parsed.error };
  const created = await createShift(clubId, userId, parsed.value);
  if (!created.success) return { success: false, error: 'Could not post the shift. Please try again.' };
  return { success: true, data: { id: created.data.id } };
}
