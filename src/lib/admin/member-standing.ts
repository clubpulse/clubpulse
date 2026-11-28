// The ONE place that writes a club member's role or junior status.
// Every other piece of server code goes through here, and the database refuses direct writes from the API.
// The checks are made here (so the caller gets a plain message) and again in set_club_member_standing /
// add_club_member (so a mistake here cannot get past the database). Each change leaves an audit row:
// who, when, old value, new value, reason.
import { createAdminClient } from '@/lib/supabase/admin';

export type StandingResult = { success: true } | { success: false; error: string };
export type StandingSource = 'club_admin' | 'platform_admin' | 'child_link' | 'join_request';

const ROLE = /^[a-z_]{2,40}$/;
const MIN_REASON = 3;

type Who = { actorId: string; platform?: boolean };

function eighteenYearsAgo(): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - 18);
  return d.toISOString().slice(0, 10);
}

async function actorIsClubAdmin(actorId: string, clubId: string): Promise<boolean> {
  const { data } = await createAdminClient().from('club_members').select('id')
    .eq('user_id', actorId).eq('club_id', clubId).eq('role', 'club_admin').eq('is_active', true).limit(1);
  return (data ?? []).length > 0;
}

/** Changes role and/or junior status of one member. Pass the values you want them to have afterwards. */
export async function changeMemberStanding(
  who: Who,
  memberId: string,
  role: string,
  isJunior: boolean,
  reason: string,
  source: StandingSource = 'club_admin',
): Promise<StandingResult> {
  if (!ROLE.test(role) || typeof isJunior !== 'boolean') return { success: false, error: 'That role is not valid.' };
  if (typeof reason !== 'string' || reason.trim().length < MIN_REASON) return { success: false, error: 'Give a reason for the change.' };

  const admin = createAdminClient();
  const { data: member } = await admin.from('club_members').select('id, club_id, user_id, role, is_junior').eq('id', memberId).maybeSingle();
  if (!member) return { success: false, error: 'Member not found.' };
  if (!who.platform && !(await actorIsClubAdmin(who.actorId, member.club_id as string))) {
    return { success: false, error: 'Only a club admin can change a role.' };
  }

  if (member.is_junior && !isJunior) {
    if (who.actorId === member.user_id) return { success: false, error: 'You cannot clear your own junior status.' };
    const { data: profile } = await admin.from('profiles').select('date_of_birth, dob_confirmed_by').eq('id', member.user_id as string).maybeSingle();
    if (!profile?.date_of_birth || !profile.dob_confirmed_by) {
      return { success: false, error: 'Confirm this member’s date of birth before clearing junior status.' };
    }
    if ((profile.date_of_birth as string) > eighteenYearsAgo()) return { success: false, error: 'This member is under 18, so they stay a junior.' };
  }

  const { error } = await admin.rpc('set_club_member_standing', {
    p_member: memberId, p_role: role, p_junior: isJunior, p_actor: who.actorId,
    p_reason: reason.trim(), p_source: source, p_platform: !!who.platform,
  });
  if (error) return { success: false, error: 'Could not update that member.' };
  return { success: true };
}

/** Adds a member, or switches a lapsed one back on. Juniors are marked from their date of birth. */
export async function addMember(
  who: Who,
  clubId: string,
  userId: string,
  role: string,
  reason: string,
  source: StandingSource = 'club_admin',
): Promise<StandingResult> {
  if (!ROLE.test(role)) return { success: false, error: 'That role is not valid.' };
  if (typeof reason !== 'string' || reason.trim().length < MIN_REASON) return { success: false, error: 'Give a reason for the change.' };
  if (!who.platform && !(await actorIsClubAdmin(who.actorId, clubId))) return { success: false, error: 'Only a club admin can add a member.' };
  const { error } = await createAdminClient().rpc('add_club_member', {
    p_club: clubId, p_user: userId, p_role: role, p_actor: who.actorId,
    p_reason: reason.trim(), p_source: source, p_platform: !!who.platform,
  });
  if (error) return { success: false, error: 'Could not add this member.' };
  return { success: true };
}
