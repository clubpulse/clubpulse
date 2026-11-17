// Daily, weekly and monthly rewards: the rules, with no database access so they can be tested.
//
// The tasks are dynamic:
//   • Each person gets five tasks per period, drawn from a larger pool. The draw changes every day,
//     week and month, and is different for each person, but never changes part-way through a period.
//   • Each draw takes one task from each of five kinds (move, learn, play, club, grow), so the five
//     are always different sorts of thing. Daily keeps two fixed habits and rotates the other three.
//   • Step targets are set from the person's own recent walking, so they stretch a regular walker
//     and stay reachable for someone just starting.
//   • Two more tasks from the rest of the pool are offered as "keep going" extras.
//
// Design rules, so this stays habit-forming in a healthy way:
//   • Every task is something worth doing anyway: moving, learning, turning up, helping the club, playing.
//   • Nothing is lost by missing a day. Longer tasks leave room for rest days.
//   • Every reward is capped and can be claimed once. Nothing here can be bought.

/** A day counts as active with a check-in, this many steps, or a finished auction. */
export const ACTIVE_DAY_STEPS = 5_000;
export const DEFAULT_DAILY_STEPS = 6_000;
/** Team points that make a strong auction (a typical franchise scores about 1,430). */
export const STRONG_AUCTION = 1_400;

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
export type Kind = 'habit' | 'move' | 'learn' | 'play' | 'club' | 'grow';
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
  kind: Kind;
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
  /** The five tasks drawn for this period. */
  goals: Goal[];
  /** Paid for finishing several of the five. */
  bonuses: Reward[];
  /** "Keep going" tasks beyond the five. */
  extras: Goal[];
};
export type Rewards = Record<Period, PeriodRewards>;

/** Everything the rules need to know about one person. Older days are used only to set step targets. */
export type Facts = {
  /** UK date, YYYY-MM-DD. */
  today: string;
  /** streak is the step streak that day was part of. */
  steps: Array<{ date: string; count: number; streak: number }>;
  checkins: string[];
  /** Finished daily auctions. place is 1 for the winner; score is team points. */
  auctions: Array<{ date: string; place: number; score: number }>;
  /** Days on which the person asked Coach AI something. */
  coachAi: string[];
  /** Daily cricket questions answered. */
  questions: Array<{ date: string; correct: boolean }>;
  /** Days on which an Academy lesson check was attempted, and days a lesson was passed for the first time. */
  lessonAttempts: string[];
  lessonPasses: string[];
  /** Days on which a practice plan was made. */
  plansMade: string[];
  /** Signed up to volunteer, or marked present at training, since Monday. */
  clubActionThisWeek: boolean;
  /** Volunteer shifts actually turned up to this month. */
  shiftsDoneThisMonth: number;
  trainingsThisMonth: number;
  /** Scores earned from anything since Monday, and since the 1st. */
  earnedThisWeek: number;
  earnedThisMonth: number;
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

/** How far back step history is read to set targets. */
export const STEP_HISTORY_DAYS = 28;

/** The earliest date the facts need to cover: four weeks before this week or month began. */
export function factsFrom(today: string): string {
  const w = weekStart(today);
  const m = monthStart(today);
  return addDays(w < m ? w : m, -STEP_HISTORY_DAYS - 1);
}

/** The earliest date that counts toward progress: the start of this week or this month, whichever is earlier. */
export function progressFrom(today: string): string {
  const w = weekStart(today);
  const m = monthStart(today);
  return w < m ? w : m;
}

// ── The draw ─────────────────────────────────────────────────────────────────

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Orders tasks by a number worked out from the seed and each task's own key. Because every task's
 * place depends only on itself, the order of the others cannot change part-way through a period.
 */
function seededOrder(items: readonly Goal[], seed: string): Goal[] {
  return [...items].sort((a, b) => hash(`${seed}|${a.key}`) - hash(`${seed}|${b.key}`) || a.key.localeCompare(b.key));
}

/**
 * Picks the period's tasks: one of each kind in `kinds` (in that order), then two extras of
 * different kinds from what is left. The same seed always gives the same draw.
 */
export function draw(pool: readonly Goal[], kinds: readonly Kind[], seed: string): { picked: Goal[]; extras: Goal[] } {
  const shuffled = seededOrder(pool, seed);
  const picked: Goal[] = [];
  for (const kind of kinds) {
    const found = shuffled.find((g) => g.kind === kind && !picked.includes(g));
    if (found) picked.push(found);
  }
  const extras: Goal[] = [];
  for (const g of shuffled) {
    if (extras.length === 2) break;
    if (picked.includes(g) || g.kind === 'habit' || extras.some((e) => e.kind === g.kind)) continue;
    extras.push(g);
  }
  return { picked, extras };
}

// ── Step targets from the person's own walking ───────────────────────────────

const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/**
 * Average steps on days with any steps, over the four weeks up to two days before a period starts.
 * The last day is left out because its count can still change when a phone syncs late, and a
 * target must not move once the period has begun. Null with under three such days.
 */
export function usualSteps(facts: Facts, periodStart: string): number | null {
  const before = addDays(periodStart, -1);
  const from = addDays(before, -STEP_HISTORY_DAYS);
  const days = facts.steps.filter((s) => s.date >= from && s.date < before && s.count > 0);
  if (days.length < 3) return null;
  return days.reduce((a, s) => a + s.count, 0) / days.length;
}

/** A daily target a little above the person's usual, between 4,000 and 12,000. */
export function stepTarget(usual: number | null): number {
  if (usual === null) return DEFAULT_DAILY_STEPS;
  return clamp(roundTo(usual * 1.1, 500), 4_000, 12_000);
}

// ── The task pools ───────────────────────────────────────────────────────────

const n = (value: number) => value.toLocaleString('en-GB');
const count = (dates: readonly string[], test: (d: string) => boolean) => new Set(dates.filter(test)).size;

function goal(key: string, kind: Kind, icon: string, title: string, detail: string, progress: number, target: number, route?: string): Goal {
  return { key, kind, icon, title, detail, progress: Math.max(0, Math.min(progress, target)), target, done: progress >= target, route };
}

function activeDays(facts: Facts, from: string): number {
  const days = new Set<string>();
  facts.checkins.forEach((d) => days.add(d));
  facts.auctions.forEach((a) => days.add(a.date));
  facts.steps.forEach((s) => {
    if (s.count >= ACTIVE_DAY_STEPS) days.add(s.date);
  });
  return [...days].filter((d) => d >= from && d <= facts.today).length;
}

export function dailyPool(facts: Facts): Goal[] {
  const { today } = facts;
  const yesterday = addDays(today, -1);
  const target = stepTarget(usualSteps(facts, today));
  const stepsToday = facts.steps.find((s) => s.date === today)?.count ?? 0;
  const stepsYesterday = facts.steps.find((s) => s.date === yesterday)?.count ?? 0;
  const auctionToday = facts.auctions.find((a) => a.date === today);
  // With little or nothing to beat, 2,000 steps stands in for yesterday
  const toBeat = Math.max(stepsYesterday, 1_999) + 1;
  return [
    // The two fixed habits
    goal('checkin', 'habit', '👋', 'Check in', 'Open the app and tap check in.', facts.checkins.includes(today) ? 1 : 0, 1),
    goal('question', 'habit', '🧠', "Answer today's cricket question", 'One question a day. Right or wrong, you learn something.', facts.questions.some((q) => q.date === today) ? 1 : 0, 1),
    // Move
    goal('steps', 'move', '👟', `Walk ${n(target)} steps`, 'Set from how much you usually walk, with a little extra.', stepsToday, target),
    goal('beat-yesterday', 'move', '📈', "Beat yesterday's steps", stepsYesterday >= 2_000 ? `You walked ${n(stepsYesterday)} yesterday. One more than that does it.` : `Yesterday was a quiet one, so ${n(toBeat)} steps does it.`, stepsToday, toBeat),
    // Learn
    goal('lesson', 'learn', '📘', 'Take an Academy lesson check', 'Read a lesson and answer its three questions. Any score counts.', facts.lessonAttempts.includes(today) ? 1 : 0, 1, '/academy'),
    goal('coach', 'learn', '💬', 'Ask Coach AI one thing', 'A drill, a tactic, or how to fix something in your game.', facts.coachAi.includes(today) ? 1 : 0, 1, '/(tabs)/companion'),
    // Play
    goal('auction', 'play', '🔨', "Finish today's auction", 'Any finishing place counts.', auctionToday ? 1 : 0, 1, '/auction-room'),
    goal('auction-top4', 'play', '🎖️', "Finish top four in today's auction", 'Beat at least two of the five rival franchises.', auctionToday && auctionToday.place <= 4 ? 1 : 0, 1, '/auction-room'),
    goal('auction-strong', 'play', '💪', `Score ${n(STRONG_AUCTION)} team points in today's auction`, 'Fill all 15 places, meet the objectives and spend your purse well.', auctionToday?.score ?? 0, STRONG_AUCTION, '/auction-room'),
  ];
}

export function weeklyPool(facts: Facts): Goal[] {
  const { today } = facts;
  const week = weekStart(today);
  const inWeek = (d: string) => d >= week && d <= today;
  const target = stepTarget(usualSteps(facts, week));
  const weekSteps = facts.steps.filter((s) => inWeek(s.date));
  const bigDay = clamp(roundTo(target * 1.5, 500), 10_000, 18_000);
  const saturday = addDays(week, 5);
  const sunday = addDays(week, 6);
  const weekendDays = weekSteps.filter((s) => (s.date === saturday || s.date === sunday) && s.count >= ACTIVE_DAY_STEPS).length;
  const weekAuctions = facts.auctions.filter((a) => inWeek(a.date));
  const dailyRewardDays = facts.claimed.filter((c) => c.source === SOURCES.daily && inWeek(c.date)).length;
  return [
    // Move
    goal('bigday', 'move', '🥾', `Have a ${n(bigDay)}-step day`, 'One big day on your feet. A match day usually does it.', Math.max(0, ...weekSteps.map((s) => s.count)), bigDay),
    goal('steps', 'move', '🚶', `Walk ${n(roundTo(target * 6, 1_000))} steps`, 'Six days at your usual pace, with a day in hand.', weekSteps.reduce((a, s) => a + s.count, 0), roundTo(target * 6, 1_000)),
    goal('target-days', 'move', '🎯', `Hit ${n(target)} steps on 4 days`, 'Your own daily target, four times this week.', weekSteps.filter((s) => s.count >= target).length, 4),
    goal('weekend', 'move', '🌤️', 'Get out on both weekend days', `${n(ACTIVE_DAY_STEPS)} steps on Saturday and on Sunday.`, weekendDays, 2),
    // Learn
    goal('quiz', 'learn', '🧩', 'Get 3 cricket questions right', 'From the daily question. Three right answers in the week.', facts.questions.filter((q) => inWeek(q.date) && q.correct).length, 3),
    goal('lessons', 'learn', '📚', 'Pass 2 Academy lessons', 'Two lessons you have not passed before.', facts.lessonPasses.filter(inWeek).length, 2, '/academy'),
    goal('coach-days', 'learn', '💬', 'Ask Coach AI on 3 days', 'Three different days. Bring a real question each time.', count(facts.coachAi, inWeek), 3, '/(tabs)/companion'),
    goal('plan', 'learn', '🗒️', 'Make a practice plan', 'Tell Coach AI what you want to improve and get a week of sessions.', facts.plansMade.filter(inWeek).length > 0 ? 1 : 0, 1, '/academy-plan'),
    // Play
    goal('podium', 'play', '🏆', 'Finish top three in an auction', 'One podium in the daily Auction Room.', weekAuctions.some((a) => a.place <= 3) ? 1 : 0, 1, '/auction-room'),
    goal('auctions', 'play', '🔨', 'Finish 4 auctions', 'Four of the week\'s daily auctions, any finishing place.', weekAuctions.length, 4, '/auction-room'),
    goal('auction-strong', 'play', '💪', `Score ${n(STRONG_AUCTION + 20)} team points in an auction`, 'Your best squad of the week.', Math.max(0, ...weekAuctions.map((a) => a.score)), STRONG_AUCTION + 20, '/auction-room'),
    // Club
    goal('club', 'club', '🤝', 'Do one thing for your club', 'Sign up for a volunteer shift, or be marked present at training.', facts.clubActionThisWeek ? 1 : 0, 1, '/(tabs)/shifts'),
    goal('checkins', 'club', '📍', 'Check in on 5 days', 'Showing up is half of it. Two days off allowed.', count(facts.checkins, inWeek), 5),
    // Grow
    goal('earn', 'grow', '⭐', 'Earn 100 Scores', 'From anything: steps, games, lessons, rewards, matches, your club.', facts.earnedThisWeek, 100),
    goal('active', 'grow', '📅', 'Be active on 5 days', 'A check-in, 5,000 steps or a finished auction makes a day active.', activeDays(facts, week), 5),
    goal('dailies', 'grow', '✅', 'Claim the daily reward on 4 days', 'Any three daily tasks, four times this week.', dailyRewardDays, 4),
  ];
}

export function monthlyPool(facts: Facts): Goal[] {
  const { today } = facts;
  const month = monthStart(today);
  const inMonth = (d: string) => d >= month && d <= today;
  const target = stepTarget(usualSteps(facts, month));
  const monthSteps = facts.steps.filter((s) => inMonth(s.date));
  const monthAuctions = facts.auctions.filter((a) => inMonth(a.date));
  const weeklyTasks = facts.claimed.filter((c) => c.source === SOURCES.weekly && inMonth(c.date)).length;
  const turnedUp = facts.shiftsDoneThisMonth > 0 ? 2 : facts.trainingsThisMonth;
  const total = roundTo(target * 25, 5_000);
  return [
    // Move
    goal('streak', 'move', '🔥', 'Reach a 7-day step streak', 'Seven days in a row with steps synced.', Math.max(0, ...monthSteps.map((s) => s.streak)), 7),
    goal('steps', 'move', '⛰️', `Walk ${n(total)} steps`, 'Twenty-five days at your usual pace across the month.', monthSteps.reduce((a, s) => a + s.count, 0), total),
    goal('bigdays', 'move', '🥾', 'Have four 10,000-step days', 'About one a week.', monthSteps.filter((s) => s.count >= 10_000).length, 4),
    // Learn
    goal('lessons', 'learn', '🎓', 'Pass 4 Academy lessons', 'Four lessons you have not passed before. One a week.', facts.lessonPasses.filter(inMonth).length, 4, '/academy'),
    goal('quiz', 'learn', '🧩', 'Get 12 cricket questions right', 'From the daily question, across the month.', facts.questions.filter((q) => inMonth(q.date) && q.correct).length, 12),
    goal('coach-days', 'learn', '💬', 'Ask Coach AI on 8 days', 'Twice a week. Bring what you are working on.', count(facts.coachAi, inMonth), 8, '/(tabs)/companion'),
    // Play
    goal('win', 'play', '🥇', 'Win an auction', 'Finish first of the six franchises once this month.', monthAuctions.some((a) => a.place === 1) ? 1 : 0, 1, '/auction-room'),
    goal('podiums', 'play', '🏆', 'Finish top three in 4 auctions', 'About one podium a week.', monthAuctions.filter((a) => a.place <= 3).length, 4, '/auction-room'),
    goal('auctions', 'play', '🔨', 'Finish 12 auctions', 'Three a week, any finishing place.', monthAuctions.length, 12, '/auction-room'),
    // Club
    goal('turnup', 'club', '🧤', 'Turn up for your club', 'Complete a volunteer shift, or attend 2 training sessions.', turnedUp, 2, '/(tabs)/shifts'),
    goal('redeem', 'club', '🎁', 'Spend Scores on a reward', 'Redeem something in the Marketplace. You earned it.', Math.min(facts.redemptionsThisMonth, 1), 1, '/(tabs)/marketplace'),
    goal('checkins', 'club', '📍', 'Check in on 15 days', 'Every other day gets you there.', count(facts.checkins, inMonth), 15),
    // Grow
    goal('active', 'grow', '🗓️', 'Be active on 18 days', 'Roughly four days a week.', activeDays(facts, month), 18),
    goal('weeklies', 'grow', '✅', 'Complete 10 weekly tasks', 'Claimed weekly tasks count. Two or three a week gets you there.', weeklyTasks, 10),
    goal('earn', 'grow', '⭐', 'Earn 500 Scores', 'From anything across the month.', facts.earnedThisMonth, 500),
  ];
}

// ── Putting it together ──────────────────────────────────────────────────────

const PERIOD_KINDS: readonly Kind[] = ['move', 'learn', 'play', 'club', 'grow'];

/** `who` makes the draw different for each person. It only needs to be stable, such as the user id. */
export function buildRewards(facts: Facts, values: Values, who: string): Rewards {
  const { today } = facts;
  const week = weekStart(today);
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
  /** Attaches a reward paid for the task on its own. */
  const paid = (period: 'weekly' | 'monthly', extra: boolean, g: Goal): Goal => {
    const source = period === 'weekly' ? (extra ? SOURCES.weeklyExtra : SOURCES.weekly) : extra ? SOURCES.monthlyExtra : SOURCES.monthly;
    const reference = `${period === 'weekly' ? week : monthKey}:${g.key}`;
    return { ...g, reward: reward(`${period}:${g.key}`, g.title, source, reference, g.done) };
  };

  // Daily: the two habits, then one move, one learn and one play task that change each day
  const daily = draw(dailyPool(facts), ['habit', 'habit', 'move', 'learn', 'play'], `${who}|day|${today}`).picked;
  const dailyDone = daily.filter((g) => g.done).length;

  const weekly = draw(weeklyPool(facts), PERIOD_KINDS, `${who}|week|${week}`);
  const weeklyGoals = weekly.picked.map((g) => paid('weekly', false, g));

  const monthly = draw(monthlyPool(facts), PERIOD_KINDS, `${who}|month|${monthKey}`);
  const monthlyGoals = monthly.picked.map((g) => paid('monthly', false, g));

  const left = daysLeftInMonth(today);
  const weekLeft = 6 - ((toUtc(today).getUTCDay() + 6) % 7);
  return {
    daily: {
      title: 'Today',
      ends: 'New tasks at midnight',
      goals: daily,
      bonuses: [
        reward('daily:3', 'Any three done', SOURCES.daily, today, dailyDone >= 3),
        reward('daily:5', 'All five done', SOURCES.dailyAll, today, dailyDone >= 5),
      ],
      extras: [],
    },
    weekly: {
      title: 'This week',
      ends: weekLeft === 0 ? 'New tasks tomorrow' : `${weekLeft} day${weekLeft === 1 ? '' : 's'} left`,
      goals: weeklyGoals,
      bonuses: [reward('weekly:all', 'All five done', SOURCES.weeklyAll, week, weeklyGoals.every((g) => g.done))],
      extras: weekly.extras.map((g) => paid('weekly', true, g)),
    },
    monthly: {
      title: 'This month',
      ends: left === 0 ? 'New tasks tomorrow' : `${left} day${left === 1 ? '' : 's'} left`,
      goals: monthlyGoals,
      bonuses: [reward('monthly:all', 'All five done', SOURCES.monthlyAll, monthKey, monthlyGoals.every((g) => g.done))],
      extras: monthly.extras.map((g) => paid('monthly', true, g)),
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
