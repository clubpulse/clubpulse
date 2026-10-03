import { createAdminClient } from '@/lib/supabase/admin';
import { isClubAdmin } from '@/lib/auth/admin';
import { applyMultiplier, getActiveMultipliers } from '@/lib/ai/dynamic-creds';
import { isUuid } from '@/lib/utils/validate';
import type { ActionResult } from '@/lib/types/action';
import type { EarningRules } from '@/lib/types/sport';

// Pays out a volunteer session once BOTH the GPS check and the club confirmation are in.
// Safe to call repeatedly: creds_awarded is claimed with a compare-and-set, so it pays once.
export async function awardVolunteerSessionIfEligible(
  sessionId: string
): Promise<ActionResult<{ credsAwarded: number }>> {
  const admin = createAdminClient();

  const { data: session } = await admin
    .from('volunteer_sessions')
    .select('id, user_id, club_id, role, gps_confirmed, club_confirmed, creds_awarded')
    .eq('id', sessionId)
    .maybeSingle();

  if (!session) return { success: false, error: 'Session not found' };
  if (!session.gps_confirmed || !session.club_confirmed) return { success: true, data: { credsAwarded: 0 } };
  if (session.creds_awarded > 0) return { success: true, data: { credsAwarded: 0 } };

  const { data: club } = await admin.from('clubs').select('sport').eq('id', session.club_id).maybeSingle();
  const { data: sport } = await admin
    .from('sport_configs')
    .select('earning_rules')
    .eq('name', club?.sport ?? 'cricket')
    .maybeSingle();

  const base = Number((sport?.earning_rules as EarningRules | undefined)?.volunteering?.[session.role] ?? 0);
  const credits = applyMultiplier(base, await getActiveMultipliers(session.club_id));
  if (credits <= 0) return { success: true, data: { credsAwarded: 0 } };

  const { data: claimed } = await admin
    .from('volunteer_sessions')
    .update({ creds_awarded: credits })
    .eq('id', sessionId)
    .eq('creds_awarded', 0)
    .select('id');
  if (!claimed?.length) return { success: true, data: { credsAwarded: 0 } };

  const { error } = await admin.rpc('increment_creds_balance', {
    p_user_id: session.user_id,
    p_amount:  credits,
  });
  if (error) {
    await admin.from('volunteer_sessions').update({ creds_awarded: 0 }).eq('id', sessionId);
    return { success: false, error: 'Failed to award Creds' };
  }

  return { success: true, data: { credsAwarded: credits } };
}

// approverId must be a verified user id. Only an admin of the session's club may approve.
export async function approveVolunteerSession(
  approverId: string,
  sessionId: string
): Promise<ActionResult<{ credsAwarded: number }>> {
  if (!isUuid(sessionId)) return { success: false, error: 'Session not found' };

  const admin = createAdminClient();
  const { data: session } = await admin
    .from('volunteer_sessions')
    .select('id, club_id')
    .eq('id', sessionId)
    .maybeSingle();

  // Same message for "missing" and "not your club" so session ids can't be probed
  if (!session || !(await isClubAdmin(approverId, session.club_id))) {
    return { success: false, error: 'Session not found' };
  }

  await admin
    .from('volunteer_sessions')
    .update({ club_confirmed: true, status: 'approved' })
    .eq('id', sessionId)
    .eq('club_confirmed', false);

  return awardVolunteerSessionIfEligible(sessionId);
}
