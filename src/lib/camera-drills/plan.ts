export type DrillRole = 'batter' | 'bowler' | 'either';
export type DrillKey = 'squat' | 'balance' | 'shoulder' | 'jump' | 'reach' | 'plank';
/** reps: the ring counts full down-and-up cycles. hold: the ring counts seconds held in position. */
export type DrillMode = 'reps' | 'hold' | 'range';

export type DrillDef = {
  key: DrillKey;
  title: string;
  seconds: number;
  setup: string;
  target: number;
  unit: 'reps' | 'seconds' | 'degrees';
  mode: DrillMode;
  /** Under-18s do not do the jump. */
  adultOnly?: boolean;
  /** Offered on the page, but not part of the starting checks or the daily pick. */
  optional?: boolean;
};

export const DRILLS: DrillDef[] = [
  { key: 'squat', title: 'Bodyweight squat', seconds: 45, setup: 'Stand the phone so your head and both feet are in frame, side-on if you can. Sit down and stand up.', target: 8, unit: 'reps', mode: 'reps' },
  { key: 'balance', title: 'Single-leg balance', seconds: 40, setup: 'Face the phone. Lift one foot and hold. Then swap legs.', target: 10, unit: 'seconds', mode: 'hold' },
  { key: 'shoulder', title: 'Shoulder circles', seconds: 40, setup: 'Stand side-on, arm’s length from the phone. Circle one arm slowly from your side to overhead.', target: 120, unit: 'degrees', mode: 'range' },
  { key: 'reach', title: 'Easy reach', seconds: 30, setup: 'Stand facing the phone. Reach one arm overhead, then the other. Keep it easy.', target: 6, unit: 'reps', mode: 'reps' },
  { key: 'jump', title: 'Easy bounce', seconds: 30, setup: 'Stand side-on with your whole body in frame. A small bounce is enough. This is not a max effort.', target: 5, unit: 'reps', mode: 'reps', adultOnly: true },
  { key: 'plank', title: 'Plank hold', seconds: 60, setup: 'Put the phone on the floor side-on, about two metres away. Get into a plank, forearms down, body in a straight line. Hold as long as is comfortable, and stop if it hurts.', target: 30, unit: 'seconds', mode: 'hold', optional: true },
];

export const BASELINE_KEYS: DrillKey[] = ['squat', 'balance', 'shoulder', 'jump'];

/** Holds that can be started from the page without being part of the baseline. */
export function optionalDrills(): DrillDef[] {
  return DRILLS.filter((drill) => drill.optional);
}

export function drillsFor(junior: boolean): DrillDef[] {
  return DRILLS.filter((drill) => !(junior && drill.adultOnly) && !drill.optional);
}

export function baselineTests(junior: boolean): DrillDef[] {
  const keys: DrillKey[] = junior ? ['squat', 'balance', 'shoulder', 'reach'] : ['squat', 'balance', 'shoulder', 'jump'];
  return keys.map((key) => DRILLS.find((drill) => drill.key === key)!);
}

export type BaselineScores = Partial<Record<DrillKey, number>>;

/** One drill for the day. Bowlers lean toward the shoulder, batters toward balance, and a low score wins. */
export function pickDailyDrill(input: { role: DrillRole; scores: BaselineScores; junior: boolean; day: string }): DrillDef {
  const pool = drillsFor(input.junior);
  const bias: Partial<Record<DrillKey, number>> = input.role === 'bowler' ? { shoulder: -8 } : input.role === 'batter' ? { balance: -8 } : {};
  const ranked = [...pool].sort((a, b) => {
    const as = (input.scores[a.key] ?? 50) + (bias[a.key] ?? 0);
    const bs = (input.scores[b.key] ?? 50) + (bias[b.key] ?? 0);
    if (as !== bs) return as - bs;
    return a.key.localeCompare(b.key);
  });
  const dayIndex = Math.abs(hashDay(input.day)) % Math.max(1, Math.min(2, ranked.length));
  return ranked[dayIndex] ?? ranked[0];
}

function hashDay(day: string): number {
  let n = 0;
  for (const ch of day) n = (n * 33 + ch.charCodeAt(0)) % 997;
  return n;
}

/** Days are yyyy-mm-dd. The run counts back from today. Missing today does not wipe the story for under-18s in the copy. */
export function streakDays(done: string[], today: string): number {
  const set = new Set(done);
  let cursor = today;
  let count = 0;
  if (!set.has(cursor)) cursor = previousDay(cursor);
  while (set.has(cursor)) {
    count += 1;
    cursor = previousDay(cursor);
  }
  return count;
}

export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function streakLine(count: number, junior: boolean): string {
  if (junior) return count > 0 ? `${count} day${count === 1 ? '' : 's'} in a row. You can pick this up whenever you like.` : 'You can pick this up whenever you like.';
  return count > 0 ? `${count} day${count === 1 ? '' : 's'} in a row.` : 'No days yet. A short one today starts the run.';
}

export function weakAreas(scores: BaselineScores): DrillKey[] {
  return (Object.entries(scores) as Array<[DrillKey, number]>).filter(([, score]) => score < 60).map(([key]) => key);
}
