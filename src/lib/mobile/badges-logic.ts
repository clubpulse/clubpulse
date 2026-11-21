// Badges: one for every achievement, each of which can be shared.
//
// A badge is earned by doing something a number of times over a member's whole time on ClubPulse
// (the Run Chase tasks cover today, this week and this month). Badges carry no Scores: they are
// for showing, not spending. This file has no database in it, so it can be tested on its own.

export type BadgeGroup = 'technique' | 'wellness' | 'academy' | 'club' | 'scores';

/** Everything a badge can be earned from, counted over all time. */
export type Stats = {
  analyses: number;
  coachAiDays: number;
  warmupDays: number;
  /** Different weeks of Mind Nets finished (1 to 6) */
  mindWeeks: number;
  lessonsPassed: number;
  questionsRight: number;
  auctionWins: number;
  trainings: number;
  checkins: number;
  /** Days with at least ACTIVE_DAY_STEPS steps */
  activeDays: number;
  bestStepStreak: number;
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

export const BADGE_DEFS: readonly Def[] = [
  // The Nets
  { key: 'first-ball', group: 'technique', icon: '🎥', title: 'First Ball', how: 'Analyse your first shot or delivery.', did: 'analysed my technique for the first time', stat: 'analyses', target: 1 },
  { key: 'net-regular', group: 'technique', icon: '🏏', title: 'Net Regular', how: 'Analyse your technique 10 times.', did: 'analysed my technique 10 times', stat: 'analyses', target: 10 },
  { key: 'technician', group: 'technique', icon: '🎯', title: 'Technician', how: 'Analyse your technique 50 times.', did: 'analysed my technique 50 times', stat: 'analyses', target: 50 },
  { key: 'twelfth-man', group: 'technique', icon: '💬', title: 'Twelfth Man', how: 'Ask Coach AI on 10 different days.', did: 'worked with Coach AI on 10 days', stat: 'coachAiDays', target: 10 },
  // Warm-Up
  { key: 'deep-breath', group: 'wellness', icon: '🧘', title: 'Deep Breath', how: 'Finish your first Warm-Up session.', did: 'finished my first mental warm-up', stat: 'warmupDays', target: 1 },
  { key: 'settled', group: 'wellness', icon: '🧠', title: 'Settled at the Crease', how: 'Do a Warm-Up session on 10 days.', did: 'warmed up my mind on 10 days', stat: 'warmupDays', target: 10 },
  { key: 'unflappable', group: 'wellness', icon: '🧊', title: 'Unflappable', how: 'Do a Warm-Up session on 30 days.', did: 'warmed up my mind on 30 days', stat: 'warmupDays', target: 30 },
  { key: 'mind-nets', group: 'wellness', icon: '🥅', title: 'Mind Nets', how: 'Finish a week of Mind Nets.', did: 'finished a week of mental skills training', stat: 'mindWeeks', target: 1 },
  { key: 'full-course', group: 'wellness', icon: '🏅', title: 'Full Course', how: 'Finish all six weeks of Mind Nets.', did: 'finished all six weeks of mental skills training', stat: 'mindWeeks', target: 6 },
  // Academy
  { key: 'opening-lesson', group: 'academy', icon: '🎓', title: 'Opening Lesson', how: 'Pass your first lesson.', did: 'passed my first cricket lesson', stat: 'lessonsPassed', target: 1 },
  { key: 'student', group: 'academy', icon: '📘', title: 'Student of the Game', how: 'Pass 5 lessons.', did: 'passed 5 cricket lessons', stat: 'lessonsPassed', target: 5 },
  { key: 'scholar', group: 'academy', icon: '📚', title: 'Cricket Scholar', how: 'Pass 15 lessons.', did: 'passed 15 cricket lessons', stat: 'lessonsPassed', target: 15 },
  { key: 'good-call', group: 'academy', icon: '☝️', title: 'Good Call', how: 'Get the daily question right 10 times.', did: 'got the daily cricket question right 10 times', stat: 'questionsRight', target: 10 },
  { key: 'elite-panel', group: 'academy', icon: '🧑‍⚖️', title: 'Elite Panel', how: 'Get the daily question right 50 times.', did: 'got the daily cricket question right 50 times', stat: 'questionsRight', target: 50 },
  { key: 'winning-bid', group: 'academy', icon: '🔨', title: 'Winning Bid', how: 'Finish first in the Auction Room.', did: 'won the Auction Room', stat: 'auctionWins', target: 1 },
  // Pavilion
  { key: 'team-sheet', group: 'club', icon: '📋', title: 'On the Team Sheet', how: 'Be marked present at a training session.', did: 'turned up to training with my club', stat: 'trainings', target: 1 },
  { key: 'club-regular', group: 'club', icon: '🧤', title: 'Club Regular', how: 'Attend 10 training sessions.', did: 'attended 10 training sessions with my club', stat: 'trainings', target: 10 },
  { key: 'heart-of-club', group: 'club', icon: '💙', title: 'Heart of the Club', how: 'Attend 25 training sessions.', did: 'attended 25 training sessions with my club', stat: 'trainings', target: 25 },
  // Bonus Points
  { key: 'off-the-mark', group: 'scores', icon: '⭐', title: 'Off the Mark', how: 'Earn your first Scores.', did: 'got off the mark', stat: 'scoresEarned', target: 1 },
  { key: 'four-figures', group: 'scores', icon: '💯', title: 'Four Figures', how: 'Earn 1,000 Scores in total.', did: 'earned 1,000 Scores', stat: 'scoresEarned', target: 1000 },
  { key: 'maiden-over', group: 'scores', icon: '✅', title: 'Maiden Over', how: 'Check in on 6 days.', did: 'checked in on 6 days', stat: 'checkins', target: 6 },
  { key: 'half-century', group: 'scores', icon: '5️⃣', title: 'Half-Century', how: 'Check in on 50 days.', did: 'checked in on 50 days', stat: 'checkins', target: 50 },
  { key: 'century', group: 'scores', icon: '🏆', title: 'Century', how: 'Check in on 100 days.', did: 'checked in on 100 days', stat: 'checkins', target: 100 },
  { key: 'quick-single', group: 'scores', icon: '👟', title: 'Quick Single', how: 'Have your first active day of 5,000 steps.', did: 'had my first active day', stat: 'activeDays', target: 1 },
  { key: 'between-wickets', group: 'scores', icon: '🏃', title: 'Running Between the Wickets', how: 'Keep a step streak going for 7 days.', did: 'kept a 7-day step streak', stat: 'bestStepStreak', target: 7 },
  { key: 'run-chaser', group: 'scores', icon: '🎁', title: 'Run Chaser', how: 'Claim 25 Run Chase rewards.', did: 'completed 25 Run Chase tasks', stat: 'tasksClaimed', target: 25 },
  { key: 'finisher', group: 'scores', icon: '🚀', title: 'Finisher', how: 'Claim 100 Run Chase rewards.', did: 'completed 100 Run Chase tasks', stat: 'tasksClaimed', target: 100 },
];

export const GROUPS: ReadonlyArray<{ key: BadgeGroup; title: string }> = [
  { key: 'technique', title: 'The Nets' },
  { key: 'wellness', title: 'Warm-Up' },
  { key: 'academy', title: 'Academy' },
  { key: 'club', title: 'Pavilion' },
  { key: 'scores', title: 'Bonus Points' },
];

export const SHARE_BASE = 'https://clubpulse.co/badge';

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
  return `I ${def.did} and earned the ${def.title} badge on ClubPulse 🏏`;
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
