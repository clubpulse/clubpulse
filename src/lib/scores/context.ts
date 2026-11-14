// Server-only: imports the service-role client. Never import from a Client Component.
import { createAdminClient } from '@/lib/supabase/admin';

// Server-only helpers shared by the Scores engine actions. They use the service role and are
// only ever called with a user id that requireUser() has already verified.

/** The player's first active club, or null. */
export async function getPrimaryClubId(userId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.club_id as string | undefined) ?? null;
}

export async function isActiveMember(userId: string, clubId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from('club_members')
    .select('id')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle();
  return !!data;
}

/**
 * Age gate for chance-based features (raffle, scratch cards, auction, Daily Spin):
 * the player has confirmed they are 18 or over and the club has not marked them as a junior.
 */
export async function isAdultPlayer(userId: string, clubId: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc('is_adult_player', {
    p_user_id: userId,
    p_club_id: clubId,
  });
  if (error) return false; // fail closed
  return data === true;
}

export const AGE_GATE_MESSAGE =
  'This feature is for players aged 18 or over. Confirm your age on the Play page to use it.';

/** Today in UK time as YYYY-MM-DD: the day boundary for check-ins and games. */
export function ukToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London' }).format(now);
}

/** Monday 00:00 UTC of the current week, matching date_trunc('week', now()) in the database. */
export function weekStartIso(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString();
}

export function monthStartIso(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export type AwardResult = { ok: boolean; amount?: number; capped?: boolean; error?: string };

export async function awardScores(
  userId: string,
  clubId: string,
  source: string,
  reference: string | null,
  multiplier = 1,
): Promise<AwardResult> {
  const { data, error } = await createAdminClient().rpc('award_scores', {
    p_user_id: userId,
    p_club_id: clubId,
    p_source: source,
    p_reference: reference,
    p_multiplier: multiplier,
  });
  if (error) return { ok: false, error: error.message };
  return data as AwardResult;
}

export const AWARD_ERRORS: Record<string, string> = {
  disabled: 'Your club has switched this off.',
  not_member: 'You need to be a member of a club.',
  already_awarded: 'You have already claimed this.',
  weekly_cap_reached: 'You have reached your club\'s weekly Scores limit. It resets on Monday.',
  unknown_source: 'This reward is not set up yet.',
};
