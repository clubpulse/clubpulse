// Server-only. Loads what the reward rules need for one person, and pays claims.
// Every claim is re-checked here against the database; the app only ever sends a reward id.

import { createAdminClient } from '@/lib/supabase/admin';
import { AWARD_ERRORS, awardScores, getPrimaryClubId, ukToday } from '@/lib/scores/context';
import { QUIZ_BANK, dailyQuestionIndex } from '@/lib/scores/quiz-bank';
import {
  SOURCES, addDays, allRewards, buildRewards, factsFrom, findReward, monthStart, weekStart,
  type Facts, type RewardSource, type Rewards, type Values,
} from '@/lib/mobile/rewards-logic';

type Admin = ReturnType<typeof createAdminClient>;
const ALL_SOURCES = Object.values(SOURCES) as RewardSource[];

export type DailyQuestion = {
  q: string;
  options: string[];
  /** Set once answered. The right answer is only sent after the person has answered. */
  answered: { choice: number; correct: boolean; answer: number } | null;
};
export type RewardsResponse = {
  /** Why rewards cannot be earned right now, or null. */
  unavailable: string | null;
  rewards: Rewards | null;
  /** Rewards ready to claim. */
  ready: number;
  question: DailyQuestion | null;
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
  // Fewer rows than rules means the database change for rewards has not been applied (or not fully)
  return { values, missing: (rules ?? []).length < ALL_SOURCES.length };
}

/** Midnight UK time is at most an hour from midnight UTC; starting an hour early covers both. */
const fromTs = (date: string) => `${addDays(date, -1)}T23:00:00Z`;

async function loadFacts(admin: Admin, userId: string, clubId: string, today: string): Promise<Facts> {
  const from = factsFrom(today);
  const week = weekStart(today);
  const month = monthStart(today);

  const [steps, checkins, plays, activity, ledger, earned, signups, attendance, shiftsDone, redemptions] = await Promise.all([
    admin.from('steps_log').select('log_date, step_count, streak_day').eq('user_id', userId).gte('log_date', from).lte('log_date', today),
    admin.from('daily_checkins').select('checkin_date').eq('user_id', userId).gte('checkin_date', from),
    admin.from('game_plays').select('play_date, state').eq('user_id', userId).eq('game', 'auction').eq('finished', true).gte('play_date', from),
    admin.from('app_activity').select('kind, activity_date, data').eq('user_id', userId).gte('activity_date', from),
    admin.from('scores_ledger').select('source, reference, created_at').eq('user_id', userId).in('source', ALL_SOURCES).gte('created_at', fromTs(from)),
    admin.from('scores_ledger').select('amount, created_at').eq('user_id', userId).gte('created_at', fromTs(week)).limit(2000),
    admin.from('volunteer_shift_signups').select('id, volunteer_shifts!inner(club_id)').eq('user_id', userId)
      .eq('volunteer_shifts.club_id', clubId).not('status', 'in', '(cancelled,no_show)').gte('signed_up_at', fromTs(week)).limit(1),
    admin.from('training_attendance').select('session_id, training_sessions!inner(club_id, session_date)').eq('user_id', userId)
      .eq('training_sessions.club_id', clubId).gte('training_sessions.session_date', from).lte('training_sessions.session_date', today),
    admin.from('volunteer_shift_signups').select('id, volunteer_shifts!inner(club_id, shift_date)').eq('user_id', userId)
      .eq('volunteer_shifts.club_id', clubId).in('status', ['checked_in', 'completed'])
      .gte('volunteer_shifts.shift_date', month).lte('volunteer_shifts.shift_date', today),
    admin.from('reward_redemptions').select('id', { count: 'exact', head: true }).eq('user_id', userId)
      .not('status', 'in', '(cancelled,refunded)').gte('redeemed_at', fromTs(month)),
  ]);

  const sessionDates = (attendance.data ?? []).map(
    (r) => (r.training_sessions as unknown as { session_date: string }).session_date,
  );
  const acts = activity.data ?? [];
  return {
    today,
    steps: (steps.data ?? []).map((r) => ({
      date: r.log_date as string,
      count: r.step_count as number,
      streak: (r.streak_day as number | null) ?? 0,
    })),
    checkins: (checkins.data ?? []).map((r) => r.checkin_date as string),
    auctions: (plays.data ?? []).map((r) => ({
      date: r.play_date as string,
      place: (r.state as { place?: number } | null)?.place ?? 99,
    })),
    coachAi: acts.filter((a) => a.kind === 'coach_ai').map((a) => a.activity_date as string),
    questions: acts
      .filter((a) => a.kind === 'daily_question')
      .map((a) => ({ date: a.activity_date as string, correct: (a.data as { correct?: boolean } | null)?.correct === true })),
    clubActionThisWeek: (signups.data ?? []).length > 0 || sessionDates.some((d) => d >= week),
    shiftsDoneThisMonth: (shiftsDone.data ?? []).length,
    trainingsThisMonth: sessionDates.filter((d) => d >= month).length,
    earnedThisWeek: (earned.data ?? [])
      .filter((r) => ukToday(new Date(r.created_at as string)) >= week)
      .reduce((a, r) => a + (r.amount as number), 0),
    redemptionsThisMonth: redemptions.count ?? 0,
    claimed: (ledger.data ?? []).map((r) => ({
      source: r.source as string,
      reference: (r.reference as string | null) ?? '',
      date: ukToday(new Date(r.created_at as string)),
    })),
  };
}

// ── The daily cricket question ───────────────────────────────────────────────

type QuestionRow = { data: { choice?: number; correct?: boolean } | null };

async function loadQuestion(admin: Admin, userId: string, today: string): Promise<DailyQuestion> {
  const question = QUIZ_BANK[dailyQuestionIndex(today)];
  const { data } = await admin
    .from('app_activity')
    .select('data')
    .eq('user_id', userId)
    .eq('kind', 'daily_question')
    .eq('activity_date', today)
    .maybeSingle();
  const row = data as QuestionRow | null;
  return {
    q: question.q,
    options: [...question.options],
    answered: row ? { choice: row.data?.choice ?? -1, correct: row.data?.correct === true, answer: question.answer } : null,
  };
}

type Failure = { ok: false; error: string; status: number };

export async function answerQuestion(
  userId: string,
  choice: number,
): Promise<{ ok: true; correct: boolean; answer: number } | Failure> {
  const today = ukToday();
  const question = QUIZ_BANK[dailyQuestionIndex(today)];
  if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) {
    return { ok: false, error: 'Pick one of the answers.', status: 400 };
  }
  const correct = choice === question.answer;
  // The primary key (user, kind, date) makes this once a day: a second answer is refused, not overwritten
  const { error } = await createAdminClient()
    .from('app_activity')
    .insert({ user_id: userId, kind: 'daily_question', activity_date: today, data: { choice, correct } });
  if (error) {
    const again = error.code === '23505';
    return { ok: false, error: again ? "You have already answered today's question." : 'Could not save your answer.', status: again ? 409 : 500 };
  }
  return { ok: true, correct, answer: question.answer };
}

/** Records that the person used a feature today. Safe to call more than once a day; never throws. */
export async function logActivity(userId: string, kind: 'coach_ai'): Promise<void> {
  try {
    await createAdminClient()
      .from('app_activity')
      .upsert({ user_id: userId, kind, activity_date: ukToday(), data: {} }, { onConflict: 'user_id,kind,activity_date', ignoreDuplicates: true });
  } catch {
    // Logging a task must never break the feature it is logging
  }
}

// ── Rewards ──────────────────────────────────────────────────────────────────

async function context(userId: string) {
  const admin = createAdminClient();
  const today = ukToday();
  const clubId = await getPrimaryClubId(userId);
  if (!clubId) return { admin, today, clubId: null, unavailable: 'Join a club to start earning rewards.' as string | null, rewards: null as Rewards | null };

  const { values, missing } = await loadValues(admin, clubId);
  if (missing) return { admin, today, clubId, unavailable: 'Rewards are not switched on yet.', rewards: null };

  const facts = await loadFacts(admin, userId, clubId, today);
  return { admin, today, clubId, unavailable: null, rewards: buildRewards(facts, values) };
}

export async function getRewards(userId: string): Promise<RewardsResponse> {
  const ctx = await context(userId);
  return {
    unavailable: ctx.unavailable,
    rewards: ctx.rewards,
    ready: ctx.rewards ? allRewards(ctx.rewards).filter((r) => r.ready && !r.claimed && r.amount > 0).length : 0,
    question: ctx.rewards ? await loadQuestion(ctx.admin, userId, ctx.today) : null,
  };
}

export async function claimReward(
  userId: string,
  rewardId: string,
): Promise<{ ok: true; amount: number; capped: boolean } | Failure> {
  const ctx = await context(userId);
  if (!ctx.rewards || !ctx.clubId) return { ok: false, error: ctx.unavailable ?? AWARD_ERRORS.not_member, status: 403 };

  const reward = findReward(ctx.rewards, rewardId);
  if (!reward) return { ok: false, error: 'Unknown reward.', status: 404 };
  if (reward.claimed) return { ok: false, error: 'You have already claimed this.', status: 409 };
  if (!reward.ready) return { ok: false, error: 'Not finished yet. Complete the task first.', status: 409 };
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
