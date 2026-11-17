// Daily, weekly and monthly rewards: the rules, with no database access so they can be tested.
//
// Design rules, so this stays habit-forming in a healthy way:
//   • Every reward is for something worth doing anyway: moving, turning up, helping the club, playing.
//   • Nothing is lost by missing a day. Weekly and monthly goals leave room for rest days.
//   • Every reward is capped and can be claimed once. Nothing here can be bought.

export const DAILY_STEPS = 6_000;
/** A day counts as active with a check-in, this many steps, or a finished auction. */
export const ACTIVE_DAY_STEPS = 5_000;
export const WEEK_ACTIVE_DAYS = 5;
export const WEEK_STEPS = 40_000;
export const MONTH_ACTIVE_DAYS = 18;
export const MONTH_STEPS = 150_000;
export const MONTH_WEEKLY_REWARDS = 8;

export const SOURCES = {
  daily: 'reward_daily',
  weekly: 'reward_weekly',
  weeklyAll: 'reward_weekly_all',
  monthly: 'reward_monthly',
  monthlyAll: 'reward_monthly_all',
} as const;
export type RewardSource = (typeof SOURCES)[keyof typeof SOURCES];

export type Period = 'daily' | 'weekly' | 'monthly';
export type Goal = {
  key: string;
  icon: string;
  title: string;
  /** Why it is worth doing, or how to do it. */
  detail: string;
  progress: number;
  target: number;
  done: boolean;
  /** Where in the app the goal is done, when there is one place. */
  route?: string;
};
export type Reward = {
  /** Sent back to claim it. */
  id: string;
  label: string;
  amount: number;
  /** The goals behind it are done. */
  ready: boolean;
  claimed: boolean;
  source: RewardSource;
  reference: string;
};
export type PeriodRewards = { title: string; ends: string; goals: Goal[]; rewards: Reward[] };
export type Rewards = Record<Period, PeriodRewards>;

/** Everything the rules need to know about one person, already limited to the days that matter. */
export type Facts = {
  /** UK date, YYYY-MM-DD. */
  today: string;
  steps: Array<{ date: string; count: number }>;
  checkins: string[];
  /** Finished daily auctions. place is 1 for the winner. */
  auctions: Array<{ date: string; place: number }>;
  /** Signed up to volunteer, or marked present at training, since Monday. */
  clubActionThisWeek: boolean;
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

function stepsSince(facts: Facts, from: string): number {
  return facts.steps.filter((s) => s.date >= from && s.date <= facts.today).reduce((a, s) => a + s.count, 0);
}

function goal(key: string, icon: string, title: string, detail: string, progress: number, target: number, route?: string): Goal {
  return { key, icon, title, detail, progress: Math.min(progress, target), target, done: progress >= target, route };
}

export function buildRewards(facts: Facts, values: Values): Rewards {
  const { today } = facts;
  const week = weekStart(today);
  const month = monthStart(today);
  const monthKey = today.slice(0, 7);
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

  // Daily: three small things, paid for any two and again for all three
  const stepsToday = facts.steps.find((s) => s.date === today)?.count ?? 0;
  const dailyGoals = [
    goal('checkin', '👋', 'Check in', 'Open the app and tap check in.', facts.checkins.includes(today) ? 1 : 0, 1),
    goal('steps', '👟', `Walk ${DAILY_STEPS.toLocaleString('en-GB')} steps`, 'About 45 minutes on your feet across the day.', stepsToday, DAILY_STEPS),
    goal('auction', '🔨', "Finish today's auction", 'Any finishing place counts.', facts.auctions.some((a) => a.date === today) ? 1 : 0, 1, '/auction-room'),
  ];
  const dailyDone = dailyGoals.filter((g) => g.done).length;

  // Weekly: four goals that take most of a week, each paid, with a bonus for all four
  const weeklyGoals = [
    goal('active', '📅', `Be active on ${WEEK_ACTIVE_DAYS} days`, 'A check-in, 5,000 steps or a finished auction makes a day active. Two rest days allowed.', activeDays(facts, week), WEEK_ACTIVE_DAYS),
    goal('steps', '🚶', `Walk ${WEEK_STEPS.toLocaleString('en-GB')} steps`, 'Under 6,000 a day. Match days and training count.', stepsSince(facts, week), WEEK_STEPS),
    goal('podium', '🏆', 'Finish top three in an auction', 'One podium in the daily Auction Room this week.', facts.auctions.some((a) => a.date >= week && a.place <= 3) ? 1 : 0, 1, '/auction-room'),
    goal('club', '🤝', 'Do one thing for your club', 'Sign up for a volunteer shift, or be marked present at training.', facts.clubActionThisWeek ? 1 : 0, 1, '/(tabs)/shifts'),
  ];

  // Monthly: the long game
  const weeklyRewardsThisMonth = facts.claimed.filter((c) => c.source === SOURCES.weekly && c.date >= month).length;
  const monthlyGoals = [
    goal('active', '🗓️', `Be active on ${MONTH_ACTIVE_DAYS} days`, 'Roughly four days a week.', activeDays(facts, month), MONTH_ACTIVE_DAYS),
    goal('steps', '⛰️', `Walk ${MONTH_STEPS.toLocaleString('en-GB')} steps`, 'About 5,000 a day across the month.', stepsSince(facts, month), MONTH_STEPS),
    goal('weeklies', '✅', `Claim ${MONTH_WEEKLY_REWARDS} weekly rewards`, 'Two weekly goals a week gets you there.', weeklyRewardsThisMonth, MONTH_WEEKLY_REWARDS),
  ];

  const left = daysLeftInMonth(today);
  const weekLeft = 6 - ((toUtc(today).getUTCDay() + 6) % 7);
  return {
    daily: {
      title: 'Today',
      ends: 'Resets at midnight',
      goals: dailyGoals,
      rewards: [
        reward('daily:2', 'Any two done', SOURCES.daily, `${today}:2`, dailyDone >= 2),
        reward('daily:3', 'All three done', SOURCES.daily, `${today}:3`, dailyDone >= 3),
      ],
    },
    weekly: {
      title: 'This week',
      ends: weekLeft === 0 ? 'Ends tonight' : `${weekLeft} day${weekLeft === 1 ? '' : 's'} left`,
      goals: weeklyGoals,
      rewards: [
        ...weeklyGoals.map((g) => reward(`weekly:${g.key}`, g.title, SOURCES.weekly, `${week}:${g.key}`, g.done)),
        reward('weekly:all', 'All four done', SOURCES.weeklyAll, week, weeklyGoals.every((g) => g.done)),
      ],
    },
    monthly: {
      title: 'This month',
      ends: left === 0 ? 'Ends tonight' : `${left} day${left === 1 ? '' : 's'} left`,
      goals: monthlyGoals,
      rewards: [
        ...monthlyGoals.map((g) => reward(`monthly:${g.key}`, g.title, SOURCES.monthly, `${monthKey}:${g.key}`, g.done)),
        reward('monthly:all', 'All three done', SOURCES.monthlyAll, monthKey, monthlyGoals.every((g) => g.done)),
      ],
    },
  };
}

export function findReward(rewards: Rewards, id: string): Reward | null {
  for (const period of ['daily', 'weekly', 'monthly'] as const) {
    const found = rewards[period].rewards.find((r) => r.id === id);
    if (found) return found;
  }
  return null;
}
