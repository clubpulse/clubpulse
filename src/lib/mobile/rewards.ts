// Server-only. Loads what the reward rules need for one person, and pays claims.
// Every claim is re-checked here against the database; the app only ever sends a reward id.

import { createAdminClient } from '@/lib/supabase/admin';
import { AWARD_ERRORS, awardScores, getPrimaryClubId, ukToday } from '@/lib/scores/context';
import {
  SOURCES, addDays, buildRewards, factsFrom, findReward, weekStart,
  type Facts, type RewardSource, type Rewards, type Values,
} from '@/lib/mobile/rewards-logic';

type Admin = ReturnType<typeof createAdminClient>;
const ALL_SOURCES = Object.values(SOURCES) as RewardSource[];

export type RewardsResponse = {
  /** Why rewards cannot be earned right now, or null. */
  unavailable: string | null;
  rewards: Rewards | null;
  /** Rewards ready to claim. */
  ready: number;
  checkin: { doneToday: boolean };
};

async function loadValues(admin: Admin, clubId: string): Promise<{ values: Values; missing: boolean }> {
  const [{ data: rules }, { data: overrides }] = await Promise.all([
    admin.from('scores_rules').select('source, default_amount').in('source', ALL_SOURCES),
    admin.from('club_scores_rules').select('source, amount, is_enabled').eq('club_id', clubId).in('source', ALL_SOURCES),
  ]);
  const values = {} as Values;
  ALL_SOURCES.forEach((source) => {
    const rule = (rules ?? []).find((r) => r.source === source);
    const override = (overrides ?? []).find((o) => o.source === source);
    const enabled = !!rule && (override ? (override.is_enabled as boolean) : true);
    values[source] = enabled ? ((override?.amount as number | null | undefined) ?? (rule?.default_amount as number)) : 0;
  });
  // No rows at all means the database change for rewards has not been applied yet
  return { values, missing: (rules ?? []).length === 0 };
}

async function loadFacts(admin: Admin, userId: string, clubId: string, today: string): Promise<Facts> {
  const from = factsFrom(today);
  const week = weekStart(today);
  // Monday 00:00 UK is at most an hour away from Monday 00:00 UTC; a day's margin covers it
  const weekFromTs = `${addDays(week, -1)}T23:00:00Z`;

  const [steps, checkins, plays, ledger, signups, attendance] = await Promise.all([
    admin.from('steps_log').select('log_date, step_count').eq('user_id', userId).gte('log_date', from).lte('log_date', today),
    admin.from('daily_checkins').select('checkin_date').eq('user_id', userId).gte('checkin_date', from),
    admin.from('game_plays').select('play_date, state').eq('user_id', userId).eq('game', 'auction').eq('finished', true).gte('play_date', from),
    admin.from('scores_ledger').select('source, reference, created_at').eq('user_id', userId).in('source', ALL_SOURCES).gte('created_at', `${addDays(from, -1)}T00:00:00Z`),
    admin.from('volunteer_shift_signups').select('id, volunteer_shifts!inner(club_id)').eq('user_id', userId)
      .eq('volunteer_shifts.club_id', clubId).not('status', 'in', '(cancelled,no_show)').gte('signed_up_at', weekFromTs).limit(1),
    admin.from('training_attendance').select('session_id, training_sessions!inner(club_id, session_date)').eq('user_id', userId)
      .eq('training_sessions.club_id', clubId).gte('training_sessions.session_date', week).limit(1),
  ]);

  return {
    today,
    steps: (steps.data ?? []).map((r) => ({ date: r.log_date as string, count: r.step_count as number })),
    checkins: (checkins.data ?? []).map((r) => r.checkin_date as string),
    auctions: (plays.data ?? []).map((r) => ({
      date: r.play_date as string,
      place: ((r.state as { place?: number } | null)?.place ?? 99),
    })),
    clubActionThisWeek: (signups.data ?? []).length > 0 || (attendance.data ?? []).length > 0,
    claimed: (ledger.data ?? []).map((r) => ({
      source: r.source as string,
      reference: (r.reference as string | null) ?? '',
      date: ukToday(new Date(r.created_at as string)),
    })),
  };
}

async function context(userId: string) {
  const admin = createAdminClient();
  const today = ukToday();
  const clubId = await getPrimaryClubId(userId);
  if (!clubId) return { admin, today, clubId: null, unavailable: 'Join a club to start earning rewards.' as string | null, rewards: null as Rewards | null, checkedIn: false };

  const { values, missing } = await loadValues(admin, clubId);
  if (missing) return { admin, today, clubId, unavailable: 'Rewards are not switched on yet.', rewards: null, checkedIn: false };

  const facts = await loadFacts(admin, userId, clubId, today);
  return { admin, today, clubId, unavailable: null, rewards: buildRewards(facts, values), checkedIn: facts.checkins.includes(today) };
}

export async function getRewards(userId: string): Promise<RewardsResponse> {
  const ctx = await context(userId);
  const all = ctx.rewards ? [...ctx.rewards.daily.rewards, ...ctx.rewards.weekly.rewards, ...ctx.rewards.monthly.rewards] : [];
  return {
    unavailable: ctx.unavailable,
    rewards: ctx.rewards,
    ready: all.filter((r) => r.ready && !r.claimed && r.amount > 0).length,
    checkin: { doneToday: ctx.checkedIn },
  };
}

type Failure = { ok: false; error: string; status: number };

export async function claimReward(
  userId: string,
  rewardId: string,
): Promise<{ ok: true; amount: number; capped: boolean } | Failure> {
  const ctx = await context(userId);
  if (!ctx.rewards || !ctx.clubId) return { ok: false, error: ctx.unavailable ?? AWARD_ERRORS.not_member, status: 403 };

  const reward = findReward(ctx.rewards, rewardId);
  if (!reward) return { ok: false, error: 'Unknown reward.', status: 404 };
  if (reward.claimed) return { ok: false, error: 'You have already claimed this.', status: 409 };
  if (!reward.ready) return { ok: false, error: 'Not finished yet. Complete the goals first.', status: 409 };
  if (reward.amount <= 0) return { ok: false, error: AWARD_ERRORS.disabled, status: 409 };

  // award_scores refuses a second award with the same source and reference, so two taps pay once
  const award = await awardScores(userId, ctx.clubId, reward.source, reward.reference);
  if (!award.ok) {
    const status = award.error === 'already_awarded' || award.error === 'weekly_cap_reached' ? 409 : 400;
    return { ok: false, error: AWARD_ERRORS[award.error ?? ''] ?? 'Could not claim this reward.', status };
  }
  return { ok: true, amount: award.amount ?? 0, capped: !!award.capped };
}

export async function checkInToday(
  userId: string,
): Promise<{ ok: true; day: number; amount: number; gotCard: boolean; capped: boolean } | Failure> {
  const clubId = await getPrimaryClubId(userId);
  if (!clubId) return { ok: false, error: AWARD_ERRORS.not_member, status: 403 };

  const { data, error } = await createAdminClient().rpc('perform_daily_checkin', { p_user_id: userId, p_club_id: clubId });
  if (error) return { ok: false, error: 'Check-in failed. Please try again.', status: 500 };
  const res = data as { ok: boolean; error?: string; day?: number; amount?: number; got_card?: boolean; capped?: boolean };
  if (!res.ok) {
    if (res.error === 'already_checked_in') return { ok: false, error: 'You have already checked in today.', status: 409 };
    return { ok: false, error: AWARD_ERRORS[res.error ?? ''] ?? 'Check-in failed.', status: 400 };
  }
  return { ok: true, day: res.day ?? 1, amount: res.amount ?? 0, gotCard: !!res.got_card, capped: !!res.capped };
}
