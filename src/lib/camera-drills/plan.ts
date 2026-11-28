export type DrillRole = 'batter' | 'bowler' | 'either';
export type DrillKey = 'squat' | 'balance' | 'shoulder' | 'jump' | 'reach';

export type DrillDef = {
  key: DrillKey;
  title: string;
  seconds: number;
  setup: string;
  target: number;
  unit: 'reps' | 'seconds' | 'degrees';
  /** Under-18s do not do the jump. */
  adultOnly?: boolean;
};

export const DRILLS: DrillDef[] = [
  { key: 'squat', title: 'Bodyweight squat', seconds: 45, setup: 'Stand the phone so your head and both feet are in frame, side-on if you can. Sit down and stand up.', target: 8, unit: 'reps' },
  { key: 'balance', title: 'Single-leg balance', seconds: 40, setup: 'Face the phone. Lift one foot and hold. Then swap legs.', target: 10, unit: 'seconds' },
  { key: 'shoulder', title: 'Shoulder circles', seconds: 40, setup: 'Stand side-on, arm’s length from the phone. Circle one arm slowly from your side to overhead.', target: 120, unit: 'degrees' },
  { key: 'reach', title: 'Easy reach', seconds: 30, setup: 'Stand facing the phone. Reach one arm overhead, then the other. Keep it easy.', target: 6, unit: 'reps' },
  { key: 'jump', title: 'Easy bounce', seconds: 30, setup: 'Stand side-on with your whole body in frame. A small bounce is enough. This is not a max effort.', target: 5, unit: 'reps', adultOnly: true },
];

export const BASELINE_KEYS: DrillKey[] = ['squat', 'balance', 'shoulder', 'jump'];

export function drillsFor(junior: boolean): DrillDef[] {
  return DRILLS.filter((drill) => !(junior && drill.adultOnly));
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
