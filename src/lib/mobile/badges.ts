// Loads what a member has done over all time and turns it into badges (badges-logic.ts).

import { createAdminClient } from '@/lib/supabase/admin';
import { ACTIVE_DAY_STEPS, SOURCES } from '@/lib/mobile/rewards-logic';
import { buildBadges, type Badge, type Stats } from '@/lib/mobile/badges-logic';

export type BadgesResponse = { badges: Badge[]; earned: number; total: number };

export async function getBadges(userId: string): Promise<BadgesResponse> {
  const admin = createAdminClient();
  const count = { count: 'exact' as const, head: true };
  const activity = (kind: string) => admin.from('app_activity').select('user_id', count).eq('user_id', userId).eq('kind', kind);

  const [analyses, coachAi, warmups, mindWeeks, lessons, questions, auctions, trainings, checkins, activeDays, streak, earned, claimed] =
    await Promise.all([
      admin.from('analysis_results').select('id', count).eq('user_id', userId).eq('analysis_type', 'pose'),
      activity('coach_ai'),
      activity('warmup'),
      admin.from('app_activity').select('data').eq('user_id', userId).eq('kind', 'mind_week').limit(500),
      admin.from('academy_progress').select('user_id', count).eq('user_id', userId).not('first_passed_at', 'is', null),
      activity('daily_question').eq('data->>correct', 'true'),
      admin.from('game_plays').select('state').eq('user_id', userId).eq('game', 'auction').eq('finished', true).limit(2000),
      admin.from('training_attendance').select('session_id', count).eq('user_id', userId),
      admin.from('daily_checkins').select('user_id', count).eq('user_id', userId),
      admin.from('steps_log').select('id', count).eq('user_id', userId).gte('step_count', ACTIVE_DAY_STEPS),
      admin.from('steps_log').select('streak_day').eq('user_id', userId).order('streak_day', { ascending: false }).limit(1),
      admin.from('scores_ledger').select('amount').eq('user_id', userId).gt('amount', 0).limit(10000),
      admin.from('scores_ledger').select('id', count).eq('user_id', userId).in('source', Object.values(SOURCES)),
    ]);

  const weeks = new Set((mindWeeks.data ?? []).map((r) => (r.data as { week?: number } | null)?.week).filter((w) => Number.isInteger(w)));
  const stats: Stats = {
    analyses: analyses.count ?? 0,
    coachAiDays: coachAi.count ?? 0,
    warmupDays: warmups.count ?? 0,
    mindWeeks: weeks.size,
    lessonsPassed: lessons.count ?? 0,
    questionsRight: questions.count ?? 0,
    auctionWins: (auctions.data ?? []).filter((r) => (r.state as { place?: number } | null)?.place === 1).length,
    trainings: trainings.count ?? 0,
    checkins: checkins.count ?? 0,
    activeDays: activeDays.count ?? 0,
    bestStepStreak: ((streak.data ?? [])[0]?.streak_day as number | undefined) ?? 0,
    scoresEarned: (earned.data ?? []).reduce((a, r) => a + ((r.amount as number) ?? 0), 0),
    tasksClaimed: claimed.count ?? 0,
  };

  const badges = buildBadges(stats, { warmupOn: process.env.WARMUP_REWARDS_ENABLED === 'true' });
  return { badges, earned: badges.filter((b) => b.earned).length, total: badges.length };
}
