// Badges: one for every achievement, each of which can be shared.
//
// A badge is earned by doing something a number of times over a member's whole time on ShiftUp
// (the Run Chase tasks cover today, this week and this month). Badges carry no Scores: they are
// for showing, not spending. This file has no database in it, so it can be tested on its own.

export type BadgeGroup = 'technique' | 'wellness' | 'academy' | 'club' | 'scores';

/** Everything a badge can be earned from, counted over all time. */
export type Stats = {
  analyses: number;
  /** Ball-tracking sessions saved */
  ballSessions: number;
  coachAiDays: number;
  warmupDays: number;
  /** Different weeks of Mind Nets finished (1 to 6) */
  mindWeeks: number;
  lessonsPassed: number;
  questionsRight: number;
  auctionWins: number;
  auctionsPlayed: number;
  plansMade: number;
  trainings: number;
  checkins: number;
  /** Days with at least ACTIVE_DAY_STEPS steps */
  activeDays: number;
  bestStepStreak: number;
  totalSteps: number;
  scoresEarned: number;
  tasksClaimed: number;
};

type Def = {
  key: string;
  group: BadgeGroup;
  icon: string;
  title: string;
  /** What to do, as an instruction */
  how: string;
  /** What was done, for the share page and message: completes "I ..." */
  did: string;
  stat: keyof Stats;
  target: number;
};

type Tier = readonly [target: number, title: string, icon: string, key?: string];
type Ladder = {
  group: BadgeGroup;
  stat: keyof Stats;
  /** The instruction for a given target */
  how: (n: number) => string;
  /** What was done, completing "I ..." */
  did: (n: number) => string;
  tiers: readonly Tier[];
};

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const n0 = (n: number) => n.toLocaleString('en-GB');
const days = (n: number) => (n === 1 ? 'day' : 'days');

// Each ladder is one thing to keep doing, with a badge at every step. Targets only go as high as
// the thing allows (there are 20 lessons, and the check-in streak resets, so check-ins count days).
const LADDERS: readonly Ladder[] = [
  // The Nets
  {
    group: 'technique', stat: 'analyses',
    how: (n) => (n === 1 ? 'Analyse your first shot or delivery.' : `Analyse your technique ${n0(n)} times.`),
    did: (n) => (n === 1 ? 'analysed my technique for the first time' : `analysed my technique ${n0(n)} times`),
    tiers: [[1, 'First Ball', '🎥', 'first-ball'], [5, 'Getting Set', '🏏'], [10, 'Net Regular', '🥅', 'net-regular'], [25, 'Shot Maker', '📐'], [50, 'Technician', '🎯', 'technician'], [100, 'Master Technician', '🔬'], [250, 'Textbook', '📖']],
  },
  {
    group: 'technique', stat: 'ballSessions',
    how: (n) => (n === 1 ? 'Track your first ball.' : `Track ${n0(n)} ball sessions.`),
    did: (n) => (n === 1 ? 'tracked a ball for the first time' : `tracked ${n0(n)} ball sessions`),
    tiers: [[1, 'Eyes on the Ball', '👁️'], [5, 'Line and Length', '📏'], [10, 'Seam Up', '🧵'], [25, 'Swing King', '🌀'], [50, 'Wicket to Wicket', '🪵']],
  },
  {
    group: 'technique', stat: 'coachAiDays',
    how: (n) => (n === 1 ? 'Ask Coach AI something.' : `Ask Coach AI on ${n0(n)} different days.`),
    did: (n) => (n === 1 ? 'asked Coach AI for the first time' : `worked with Coach AI on ${n0(n)} days`),
    tiers: [[1, 'Ask the Coach', '🗣️'], [5, 'Dressing Room Chat', '🚪'], [10, 'Twelfth Man', '💬', 'twelfth-man'], [25, 'Trusted Voice', '📣'], [50, 'Head Coach Material', '🧢'], [100, 'Think Tank', '🧠']],
  },
  // Warm-Up
  {
    group: 'wellness', stat: 'warmupDays',
    how: (n) => (n === 1 ? 'Finish your first Warm-Up session.' : `Do a Warm-Up session on ${n0(n)} days.`),
    did: (n) => (n === 1 ? 'finished my first mental warm-up' : `warmed up my mind on ${n0(n)} days`),
    tiers: [[1, 'Deep Breath', '🧘', 'deep-breath'], [5, 'Calm Hands', '🤲'], [10, 'Settled at the Crease', '🧠', 'settled'], [20, 'Clear Head', '☁️'], [30, 'Unflappable', '🧊', 'unflappable'], [50, 'Ice Cool', '❄️'], [75, 'Nerves of Steel', '🛡️'], [100, 'Zen Master', '🏯']],
  },
  {
    group: 'wellness', stat: 'mindWeeks',
    how: (n) => (n === 1 ? 'Finish a week of Mind Nets.' : n === 6 ? 'Finish all six weeks of Mind Nets.' : `Finish ${n} weeks of Mind Nets.`),
    did: (n) => (n === 1 ? 'finished a week of mental skills training' : n === 6 ? 'finished all six weeks of mental skills training' : `finished ${n} weeks of mental skills training`),
    tiers: [[1, 'Mind Nets', '🥅', 'mind-nets'], [2, 'Sharp Focus', '🔍'], [3, 'Pre-Ball Routine', '🔁'], [4, 'Inner Voice', '🗨️'], [5, 'Picture It', '🖼️'], [6, 'Full Course', '🏅', 'full-course']],
  },
  // Academy
  {
    group: 'academy', stat: 'lessonsPassed',
    how: (n) => (n === 1 ? 'Pass your first lesson.' : n === 20 ? 'Pass every lesson in the Academy.' : `Pass ${n} lessons.`),
    did: (n) => (n === 1 ? 'passed my first cricket lesson' : n === 20 ? 'passed every lesson in the ShiftUp Academy' : `passed ${n} cricket lessons`),
    tiers: [[1, 'Opening Lesson', '🎓', 'opening-lesson'], [3, 'Quick Learner', '⚡'], [5, 'Student of the Game', '📘', 'student'], [8, 'Note Taker', '📝'], [10, 'Top of the Class', '🏫'], [15, 'Cricket Scholar', '📚', 'scholar'], [20, 'Full Syllabus', '🎖️']],
  },
  {
    group: 'academy', stat: 'questionsRight',
    how: (n) => (n === 1 ? 'Get the daily question right.' : `Get the daily question right ${n0(n)} times.`),
    did: (n) => (n === 1 ? 'got the daily cricket question right' : `got the daily cricket question right ${n0(n)} times`),
    tiers: [[1, 'Fair Guess', '🤔'], [5, 'Sharp Eye', '👀'], [10, 'Good Call', '☝️', 'good-call'], [25, 'Cricket Brain', '🧩'], [50, 'Elite Panel', '🧑‍⚖️', 'elite-panel'], [100, 'Match Referee', '🧾'], [365, 'Cricket Encyclopaedia', '🌍']],
  },
  {
    group: 'academy', stat: 'auctionWins',
    how: (n) => (n === 1 ? 'Finish first in the Auction Room.' : `Win the Auction Room ${n0(n)} times.`),
    did: (n) => (n === 1 ? 'won the Auction Room' : `won the Auction Room ${n0(n)} times`),
    tiers: [[1, 'Winning Bid', '🔨', 'winning-bid'], [3, 'Sharp Bidder', '🤝'], [5, 'Top of the Table', '🥇'], [10, 'Hammer Time', '🪓'], [25, 'Auction House Legend', '🏛️']],
  },
  {
    group: 'academy', stat: 'auctionsPlayed',
    how: (n) => (n === 1 ? 'Play your first Auction Room.' : `Play the Auction Room ${n0(n)} times.`),
    did: (n) => (n === 1 ? 'played my first Auction Room' : `played the Auction Room ${n0(n)} times`),
    tiers: [[1, 'Paddle Up', '🙋'], [5, 'Regular Bidder', '🪑'], [10, 'Room Regular', '🎟️'], [25, 'Lot Hunter', '🔎'], [50, 'Auction Veteran', '🎩']],
  },
  {
    group: 'academy', stat: 'plansMade',
    how: (n) => (n === 1 ? 'Make your first practice plan.' : `Make ${n} practice plans.`),
    did: (n) => (n === 1 ? 'made my first practice plan' : `made ${n} practice plans`),
    tiers: [[1, 'Game Plan', '🗒️'], [3, 'Planner', '📅'], [5, 'Season Plan', '🗓️'], [10, 'Strategist', '♟️']],
  },
  // Pavilion
  {
    group: 'club', stat: 'trainings',
    how: (n) => (n === 1 ? 'Be marked present at a training session.' : `Attend ${n} training sessions.`),
    did: (n) => (n === 1 ? 'turned up to training with my club' : `attended ${n} training sessions with my club`),
    tiers: [[1, 'On the Team Sheet', '📋', 'team-sheet'], [3, 'Turning Up', '👋'], [5, 'Ever Present', '📍'], [10, 'Club Regular', '🧤', 'club-regular'], [15, 'Pavilion Fixture', '🏟️'], [25, 'Heart of the Club', '💙', 'heart-of-club'], [40, 'Club Stalwart', '🧱'], [60, 'Club Legend', '🌟']],
  },
  // Bonus Points
  {
    group: 'scores', stat: 'scoresEarned',
    how: (n) => (n === 1 ? 'Earn your first Scores.' : `Earn ${n0(n)} Scores in total.`),
    did: (n) => (n === 1 ? 'got off the mark' : `earned ${n0(n)} Scores`),
    tiers: [[1, 'Off the Mark', '⭐', 'off-the-mark'], [100, 'Getting Going', '🚂'], [500, 'Settled In', '🛋️'], [1000, 'Four Figures', '💯', 'four-figures'], [2500, 'Big Hitter', '💥'], [5000, 'Boundary Rider', '🚧'], [10000, 'Five Figures', '🔟']],
  },
  {
    group: 'scores', stat: 'checkins',
    how: (n) => (n === 1 ? 'Check in for the first time.' : `Check in on ${n} days.`),
    did: (n) => (n === 1 ? 'checked in for the first time' : `checked in on ${n} days`),
    tiers: [[1, 'Signing In', '✍️'], [6, 'Maiden Over', '✅', 'maiden-over'], [10, 'Ten Not Out', '🔢'], [25, 'Quarter Century', '🪙'], [50, 'Half-Century', '5️⃣', 'half-century'], [75, 'Seventy-Five Up', '⬆️'], [100, 'Century', '🏆', 'century'], [365, 'Year at the Crease', '📆']],
  },
  {
    group: 'scores', stat: 'activeDays',
    how: (n) => (n === 1 ? 'Have your first active day of 5,000 steps.' : `Have ${n} active days of 5,000 steps.`),
    did: (n) => (n === 1 ? 'had my first active day' : `had ${n} active days`),
    tiers: [[1, 'Quick Single', '👟', 'quick-single'], [5, 'Brisk Two', '✌️'], [10, 'Fit for Purpose', '💪'], [25, 'Sharp Fielder', '🤸'], [50, 'Fitness Regular', '🫀'], [100, 'Iron Legs', '🦵']],
  },
  {
    group: 'scores', stat: 'bestStepStreak',
    how: (n) => `Keep a step streak going for ${n} ${days(n)}.`,
    did: (n) => `kept a ${n}-day step streak`,
    tiers: [[3, 'Hat-Trick of Days', '3️⃣'], [7, 'Running Between the Wickets', '🏃', 'between-wickets'], [14, 'Fortnight Form', '🌗'], [30, 'Month in the Middle', '🌕'], [60, 'Two-Month Run', '🔥'], [100, 'Hundred Days Hot', '☄️']],
  },
  {
    group: 'scores', stat: 'totalSteps',
    how: (n) => `Walk ${n0(n)} steps in total.`,
    did: (n) => `walked ${n0(n)} steps`,
    tiers: [[10_000, 'First Ten Thousand', '🚶'], [50_000, 'Long Walk to the Pitch', '🥾'], [100_000, 'Six-Figure Stride', '🛤️'], [250_000, 'Boundary Hunter', '🧭'], [500_000, 'Half a Million', '🏔️'], [1_000_000, 'Million Steps', '🪐']],
  },
  {
    group: 'scores', stat: 'tasksClaimed',
    how: (n) => (n === 1 ? 'Claim your first Run Chase reward.' : `Claim ${n} Run Chase rewards.`),
    did: (n) => (n === 1 ? 'completed my first Run Chase task' : `completed ${n} Run Chase tasks`),
    tiers: [[1, 'Run Chase Starter', '🎯'], [5, 'Chasing Down', '🏁'], [10, 'Steady Chase', '⏱️'], [25, 'Run Chaser', '🎁', 'run-chaser'], [50, 'Anchor the Innings', '⚓'], [100, 'Finisher', '🚀', 'finisher'], [250, 'Match Winner', '🥳']],
  },
];

export const BADGE_DEFS: readonly Def[] = LADDERS.flatMap((l) =>
  l.tiers.map(([target, title, icon, key]): Def => ({
    key: key ?? slug(title), group: l.group, icon, title, how: l.how(target), did: l.did(target), stat: l.stat, target,
  })),
);

export const GROUPS: ReadonlyArray<{ key: BadgeGroup; title: string }> = [
  { key: 'technique', title: 'The Nets' },
  { key: 'wellness', title: 'Warm-Up' },
  { key: 'academy', title: 'Academy' },
  { key: 'club', title: 'Pavilion' },
  { key: 'scores', title: 'Bonus Points' },
];

export const SHARE_BASE = 'https://shiftup.club/badge';

export type Badge = {
  key: string;
  group: BadgeGroup;
  icon: string;
  title: string;
  how: string;
  progress: number;
  target: number;
  earned: boolean;
  /** Set once earned: the words and the link to share */
  share: { message: string; url: string } | null;
};

export function badgeDef(key: string): Def | null {
  return BADGE_DEFS.find((b) => b.key === key) ?? null;
}

/** The words that go with a shared badge. No name, club or number of the member is in them. */
export function shareMessage(def: Pick<Def, 'title' | 'did'>): string {
  return `I ${def.did} and earned the ${def.title} badge on ShiftUp 🏏`;
}

/**
 * Every badge with how far along the member is. Warm-Up badges are left out until Warm-Up rewards
 * are switched on, because nothing counts towards them before then.
 */
export function buildBadges(stats: Stats, opts: { warmupOn: boolean }): Badge[] {
  return BADGE_DEFS.filter((d) => opts.warmupOn || d.group !== 'wellness').map((d) => {
    const count = Math.max(0, Math.floor(stats[d.stat] ?? 0));
    const earned = count >= d.target;
    return {
      key: d.key,
      group: d.group,
      icon: d.icon,
      title: d.title,
      how: d.how,
      progress: Math.min(count, d.target),
      target: d.target,
      earned,
      share: earned ? { message: shareMessage(d), url: `${SHARE_BASE}/${d.key}` } : null,
    };
  });
}
