import type { SupabaseClient } from '@supabase/supabase-js';
import { ageOn } from '@/lib/community/age';
import { sendEmail } from '@/lib/email/resend';
import { squadAlert } from './alert';
import { ageVerificationEnabled } from './flag';
import { PLAYER_DOB_HOLD, ageSquadMismatch, verifiedAge } from './rules';

type Admin = SupabaseClient;

/**
 * When the flag is on, a player is left off a squad when their age band does not fit, or when
 * their date of birth is not verified. The saved record has no date of birth. The player is told
 * only the neutral sentence.
 */
export async function guardSquad(admin: Admin, input: { clubId: string; userIds: string[]; ageGroup: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!ageVerificationEnabled() || input.userIds.length === 0) return { ok: true };
  const [{ data: profiles }, { data: members }, { data: checks }] = await Promise.all([
    admin.from('profiles').select('id, full_name, display_name, date_of_birth, dob_confirmed_by, dob_confirmed_at, dob_confirmation_method').in('id', input.userIds),
    admin.from('club_members').select('user_id, is_junior').eq('club_id', input.clubId).eq('is_active', true).in('user_id', input.userIds),
    admin.from('age_verifications').select('user_id, status').in('user_id', input.userIds).eq('status', 'passed'),
  ]);
  const passed = new Set((checks ?? []).filter((row) => row.status === 'passed').map((row) => row.user_id as string));
  const refused: Array<{ userId: string; name: string; reason: 'mismatch' | 'unverified' }> = [];
  for (const userId of input.userIds) {
    const profile = (profiles ?? []).find((row) => row.id === userId);
    const membership = (members ?? []).filter((row) => row.user_id === userId);
    const clubJunior = membership.length > 0 && membership.every((row) => row.is_junior === true);
    const dob = (profile?.date_of_birth as string | null) ?? null;
    const age = ageOn(dob);
    const confirmed = !!(profile?.dob_confirmed_by && profile?.dob_confirmed_at && profile?.dob_confirmation_method);
    const state = verifiedAge({ clubJunior, dob, hasVerifiedParent: true, dobConfirmed: confirmed, guardianConsented: true, thirdPartyPassed: passed.has(userId), guardianVerified: false });
    const mismatch = ageSquadMismatch({ age, clubJunior, ageGroup: input.ageGroup });
    if (!mismatch && state.status !== 'unverified' && state.status !== 'needs_dob' && state.status !== 'needs_guardian') continue;
    refused.push({
      userId,
      name: (profile?.display_name as string | null) || (profile?.full_name as string | null) || 'A player',
      reason: mismatch ? 'mismatch' : 'unverified',
    });
  }
  if (refused.length === 0) return { ok: true };
  await admin.from('age_squad_mismatches').insert(refused.map((row) => ({
    club_id: input.clubId, user_id: row.userId, age_group: input.ageGroup, reason: row.reason,
  })));
  await notifySquad(admin, input.clubId, input.ageGroup, refused);
  return { ok: false, error: PLAYER_DOB_HOLD };
}

async function notifySquad(admin: Admin, clubId: string, ageGroup: string, refused: Array<{ name: string; reason: 'mismatch' | 'unverified' }>) {
  const emails = new Set<string>();
  const lead = process.env.SAFEGUARDING_LEAD_EMAIL?.trim();
  if (lead) emails.add(lead);
  const { data: welfare } = await admin.from('club_members').select('user_id').eq('club_id', clubId).eq('is_active', true).eq('role', 'welfare_officer');
  const ids = (welfare ?? []).map((row) => row.user_id as string);
  if (ids.length) {
    const { data: profiles } = await admin.from('profiles').select('id, email').in('id', ids);
    for (const profile of profiles ?? []) if (profile.email) emails.add(profile.email as string);
  }
  for (const row of refused) {
    const message = squadAlert({ playerName: row.name, ageGroup, reason: row.reason });
    for (const to of emails) await sendEmail({ to, subject: message.subject, text: message.text });
  }
}
