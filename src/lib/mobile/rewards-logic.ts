// Daily, weekly and monthly rewards: the rules, with no database access so they can be tested.
//
// Fifteen core tasks, five per period, each a different thing to do. On top of those sit a few
// "keep going" tasks that reward carrying a habit further (more steps, more active days).
//
// Design rules, so this stays habit-forming in a healthy way:
//   • Every task is something worth doing anyway: moving, learning, turning up, helping the club, playing.
//   • Nothing is lost by missing a day. Longer tasks leave room for rest days.
//   • Every reward is capped and can be claimed once. Nothing here can be bought.

export const DAILY_STEPS = 6_000;
export const BIG_DAY_STEPS = 10_000;
/** A day counts as active with a check-in, this many steps, or a finished auction. */
export const ACTIVE_DAY_STEPS = 5_000;
export const WEEK_QUESTIONS_RIGHT = 3;
export const WEEK_SCORES_EARNED = 100;
export const WEEK_ACTIVE_DAYS = 5;
export const WEEK_STEPS = 40_000;
export const MONTH_ACTIVE_DAYS = 18;
export const MONTH_STEP_STREAK = 7;
export const MONTH_TRAININGS = 2;
export const MONTH_STEPS = 150_000;
export const MONTH_WEEKLY_TASKS = 10;

export const SOURCES = {
  daily: 'reward_daily',
  dailyAll: 'reward_daily_all',
  weekly: 'reward_weekly',
  weeklyAll: 'reward_weekly_all',
  weeklyExtra: 'reward_weekly_extra',
  monthly: 'reward_monthly',
  monthlyAll: 'reward_monthly_all',
  monthlyExtra: 'reward_monthly_extra',
} as const;
export type RewardSource = (typeof SOURCES)[keyof typeof SOURCES];

export type Period = 'daily' | 'weekly' | 'monthly';
export type Reward = {
  /** Sent back to claim it. */
  id: string;
  label: string;
  amount: number;
  /** The task or tasks behind it are done. */
  ready: boolean;
  claimed: boolean;
  source: RewardSource;
  reference: string;
};
export type Goal = {
  key: string;
  icon: string;
  title: string;
  /** Why it is worth doing, or how to do it. */
  detail: string;
  progress: number;
  target: number;
  done: boolean;
  /** Where in the app the task is done, when there is one place. */
  route?: string;
  /** Paid for this task on its own. Daily tasks are paid through the bonuses instead. */
  reward?: Reward;
};
export type PeriodRewards = {
  title: string;
  ends: string;
  /** The five core tasks. */
  goals: Goal[];
  /** Paid for finishing several core tasks. */
  bonuses: Reward[];
  /** "Keep going" tasks beyond the core five. */
  extras: Goal[];
};
export type Rewards = Record<Period, PeriodRewards>;

/** Everything the rules need to know about one person, already limited to the days that matter. */
export type Facts = {
  /** UK date, YYYY-MM-DD. */
  today: string;
  /** streak is the step streak that day was part of. */
  steps: Array<{ date: string; count: number; streak: number }>;
  checkins: string[];
  /** Finished daily auctions. place is 1 for the winner. */
  auctions: Array<{ date: string; place: number }>;
  /** Days on which the person asked Coach AI something. */
  coachAi: string[];
  /** Daily cricket questions answered. */
  questions: Array<{ date: string; correct: boolean }>;
  /** Signed up to volunteer, or marked present at training, since Monday. */
  clubActionThisWeek: boolean;
  /** Volunteer shifts actually turned up to this month. */
  shiftsDoneThisMonth: number;
  trainingsThisMonth: number;
  /** Scores earned from anything since Monday. */
  earnedThisWeek: number;
  /** Marketplace rewards redeemed this month. */
  redemptionsThisMonth: number;
  /** Rewards already claimed, from the ledger. */
  claimed: Array<{ source: string; reference: string; date: string }>;
};
/** Scores paid by each rule at this person's club. */
export type Values = Record<RewardSource, number>;

// ── Dates (all plain YYYY-MM-DD strings, so there are no time zone surprises) ──

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The Monday on or before this date. */
export function weekStart(date: string): string {
  const dow = (toUtc(date).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(date, -dow);
}

export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function daysLeftInMonth(date: string): number {
  const d = toUtc(date);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  return last - d.getUTCDate();
}

/** The earliest date the facts need to cover: the start of this week or this month, whichever is earlier. */
export function factsFrom(today: string): string {
  const w = weekStart(today);
  const m = monthStart(today);
  return w < m ? w : m;
}

// ── The rules ────────────────────────────────────────────────────────────────

function activeDays(facts: Facts, from: string): number {
  const days = new Set<string>();
  facts.checkins.forEach((d) => days.add(d));
  facts.auctions.forEach((a) => days.add(a.date));
  facts.steps.forEach((s) => {
    if (s.count >= ACTIVE_DAY_STEPS) days.add(s.date);
  });
  return [...days].filter((d) => d >= from && d <= facts.today).length;
}

function goal(key: string, icon: string, title: string, detail: string, progress: number, target: number, route?: string): Goal {
  return { key, icon, title, detail, progress: Math.max(0, Math.min(progress, target)), target, done: progress >= target, route };
}

const n = (value: number) => value.toLocaleString('en-GB');

export function buildRewards(facts: Facts, values: Values): Rewards {
  const { today } = facts;
  const week = weekStart(today);
  const month = monthStart(today);
  const monthKey = today.slice(0, 7);
  const inWeek = (d: string) => d >= week && d <= today;
  const inMonth = (d: string) => d >= month && d <= today;
  const isClaimed = (source: string, reference: string) =>
    facts.claimed.some((c) => c.source === source && c.reference === reference);
  const reward = (id: string, label: string, source: RewardSource, reference: string, ready: boolean): Reward => ({
    id,
    label,
    amount: values[source],
    ready,
    claimed: isClaimed(source, reference),
    source,
    reference,
  });
  /** Attaches a reward paid for the task on its own. */
  const paid = (period: 'weekly' | 'monthly', extra: boolean, g: Goal): Goal => {
    const source = period === 'weekly' ? (extra ? SOURCES.weeklyExtra : SOURCES.weekly) : extra ? SOURCES.monthlyExtra : SOURCES.monthly;
    const reference = `${period === 'weekly' ? week : monthKey}:${g.key}`;
    return { ...g, reward: reward(`${period}:${g.key}`, g.title, source, reference, g.done) };
  };

  // ── Daily: five quick, different things. Paid for any three, and again for all five. ──
  const stepsToday = facts.steps.find((s) => s.date === today)?.count ?? 0;
  const dailyGoals = [
    goal('checkin', '👋', 'Check in', 'Open the app and tap check in.', facts.checkins.includes(today) ? 1 : 0, 1),
    goal('steps', '👟', `Walk ${n(DAILY_STEPS)} steps`, 'About 45 minutes on your feet across the day.', stepsToday, DAILY_STEPS),
    goal('question', '🧠', "Answer today's cricket question", 'One question a day. Right or wrong, you learn something.', facts.questions.some((q) => q.date === today) ? 1 : 0, 1),
    goal('coach', '💬', 'Ask Coach AI one thing', 'A drill, a tactic, or how to fix something in your game.', facts.coachAi.includes(today) ? 1 : 0, 1, '/(tabs)/companion'),
    goal('auction', '🔨', "Finish today's auction", 'Any finishing place counts.', facts.auctions.some((a) => a.date === today) ? 1 : 0, 1, '/auction-room'),
  ];
  const dailyDone = dailyGoals.filter((g) => g.done).length;

  // ── Weekly: five different things that each take a bit of the week ──
  const bestDay = Math.max(0, ...facts.steps.filter((s) => inWeek(s.date)).map((s) => s.count));
  const weeklyGoals = [
    goal('club', '🤝', 'Do one thing for your club', 'Sign up for a volunteer shift, or be marked present at training.', facts.clubActionThisWeek ? 1 : 0, 1, '/(tabs)/shifts'),
    goal('bigday', '🥾', `Have a ${n(BIG_DAY_STEPS)}-step day`, 'One big day on your feet. A match day usually does it.', bestDay, BIG_DAY_STEPS),
    goal('podium', '🏆', 'Finish top three in an auction', 'One podium in the daily Auction Room.', facts.auctions.some((a) => inWeek(a.date) && a.place <= 3) ? 1 : 0, 1, '/auction-room'),
    goal('quiz', '🎯', `Get ${WEEK_QUESTIONS_RIGHT} cricket questions right`, 'From the daily question. Three right answers in the week.', facts.questions.filter((q) => inWeek(q.date) && q.correct).length, WEEK_QUESTIONS_RIGHT),
    goal('earn', '⭐', `Earn ${n(WEEK_SCORES_EARNED)} Scores`, 'From anything: steps, games, rewards, matches, your club.', facts.earnedThisWeek, WEEK_SCORES_EARNED),
  ].map((g) => paid('weekly', false, g));
  const weeklyExtras = [
    goal('steps', '🚶', `Walk ${n(WEEK_STEPS)} steps`, 'Under 6,000 a day across the week.', facts.steps.filter((s) => inWeek(s.date)).reduce((a, s) => a + s.count, 0), WEEK_STEPS),
    goal('active', '📅', `Be active on ${WEEK_ACTIVE_DAYS} days`, 'A check-in, 5,000 steps or a finished auction makes a day active.', activeDays(facts, week), WEEK_ACTIVE_DAYS),
  ].map((g) => paid('weekly', true, g));

  // ── Monthly: five different things for the long game ──
  const bestStreak = Math.max(0, ...facts.steps.filter((s) => inMonth(s.date)).map((s) => s.streak));
  const turnedUp = facts.shiftsDoneThisMonth > 0 ? MONTH_TRAININGS : facts.trainingsThisMonth;
  const monthlyGoals = [
    goal('win', '🥇', 'Win an auction', 'Finish first of the six franchises once this month.', facts.auctions.some((a) => inMonth(a.date) && a.place === 1) ? 1 : 0, 1, '/auction-room'),
    goal('streak', '🔥', `Reach a ${MONTH_STEP_STREAK}-day step streak`, 'Seven days in a row with steps synced.', bestStreak, MONTH_STEP_STREAK),
    goal('turnup', '🧤', 'Turn up for your club', `Complete a volunteer shift, or attend ${MONTH_TRAININGS} training sessions.`, turnedUp, MONTH_TRAININGS, '/(tabs)/shifts'),
    goal('redeem', '🎁', 'Spend Scores on a reward', 'Redeem something in the Marketplace. You earned it.', Math.min(facts.redemptionsThisMonth, 1), 1, '/(tabs)/marketplace'),
    goal('active', '🗓️', `Be active on ${MONTH_ACTIVE_DAYS} days`, 'Roughly four days a week.', activeDays(facts, month), MONTH_ACTIVE_DAYS),
  ].map((g) => paid('monthly', false, g));
  const weeklyTasksThisMonth = facts.claimed.filter((c) => c.source === SOURCES.weekly && inMonth(c.date)).length;
  const monthlyExtras = [
    goal('steps', '⛰️', `Walk ${n(MONTH_STEPS)} steps`, 'About 5,000 a day across the month.', facts.steps.filter((s) => inMonth(s.date)).reduce((a, s) => a + s.count, 0), MONTH_STEPS),
    goal('weeklies', '✅', `Complete ${MONTH_WEEKLY_TASKS} weekly tasks`, 'Claimed weekly tasks count. Two or three a week gets you there.', weeklyTasksThisMonth, MONTH_WEEKLY_TASKS),
  ].map((g) => paid('monthly', true, g));

  const left = daysLeftInMonth(today);
  const weekLeft = 6 - ((toUtc(today).getUTCDay() + 6) % 7);
  return {
    daily: {
      title: 'Today',
      ends: 'Resets at midnight',
      goals: dailyGoals,
      bonuses: [
        reward('daily:3', 'Any three done', SOURCES.daily, today, dailyDone >= 3),
        reward('daily:5', 'All five done', SOURCES.dailyAll, today, dailyDone >= 5),
      ],
      extras: [],
    },
    weekly: {
      title: 'This week',
      ends: weekLeft === 0 ? 'Ends tonight' : `${weekLeft} day${weekLeft === 1 ? '' : 's'} left`,
      goals: weeklyGoals,
      bonuses: [reward('weekly:all', 'All five done', SOURCES.weeklyAll, week, weeklyGoals.every((g) => g.done))],
      extras: weeklyExtras,
    },
    monthly: {
      title: 'This month',
      ends: left === 0 ? 'Ends tonight' : `${left} day${left === 1 ? '' : 's'} left`,
      goals: monthlyGoals,
      bonuses: [reward('monthly:all', 'All five done', SOURCES.monthlyAll, monthKey, monthlyGoals.every((g) => g.done))],
      extras: monthlyExtras,
    },
  };
}

export function allRewards(rewards: Rewards): Reward[] {
  return (['daily', 'weekly', 'monthly'] as const).flatMap((period) => {
    const p = rewards[period];
    return [...p.goals, ...p.extras].flatMap((g) => (g.reward ? [g.reward] : [])).concat(p.bonuses);
  });
}

export function findReward(rewards: Rewards, id: string): Reward | null {
  return allRewards(rewards).find((r) => r.id === id) ?? null;
}
