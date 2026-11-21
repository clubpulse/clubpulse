// Compares one technique analysis with the last one of the same kind (same discipline, same
// camera view and, for batting, the same shot) and says in plain words what got better, what
// slipped and what held steady. No AI: every sentence comes straight from the two sets of marks,
// so it can never claim an improvement the numbers do not show.

import { ON_TARGET, SHOT_TYPE_LABELS, formatRange, formatValue, metricDefFor, type MetricResult, type Mode, type ShotType, type View } from './pose-metrics';

/** A result as it is stored in analysis_results.result_json */
export type SavedAnalysis = {
  mode: string; view?: string; shotType?: string | null; overall: number;
  metrics: Array<{ key: string; label: string; value: number; score: number; excused?: boolean }>;
  createdAt?: string | null;
};

export type Verdict = 'better' | 'worse' | 'same';
export type Change = { key: string; label: string; verdict: Verdict; now: number; before: number; text: string };
export type Comparison = {
  /** When the earlier analysis was saved */
  when: string | null;
  overallNow: number; overallBefore: number; overall: Verdict;
  headline: string;
  better: Change[]; worse: Change[]; same: Change[];
};

/** A mark has to move at least this far to count as a change. Smaller moves are camera noise. */
export const NOTICEABLE = 4;

const verdictFor = (now: number, before: number): Verdict => (now - before >= NOTICEABLE ? 'better' : before - now >= NOTICEABLE ? 'worse' : 'same');

/** Two analyses can be compared when they measured the same thing from the same side. */
export function sameKind(a: { mode: string; view?: string; shotType?: string | null }, b: { mode: string; view?: string; shotType?: string | null }): boolean {
  return a.mode === b.mode && (a.view ?? 'side') === (b.view ?? 'side') && (a.mode !== 'batting' || (a.shotType ?? null) === (b.shotType ?? null));
}

export function compareAnalyses(current: { overall: number; metrics: MetricResult[] }, previous: SavedAnalysis): Comparison {
  const changes: Change[] = [];
  for (const m of current.metrics) {
    if (m.excused) continue;
    const old = previous.metrics.find((p) => p.key === m.key && !p.excused);
    if (!old) continue;
    const verdict = verdictFor(m.score, old.score);
    const range = formatRange(m);
    const now = formatValue(m);
    const before = formatValue({ unit: m.unit, value: old.value });
    const inRange = m.score >= ON_TARGET;
    const wasInRange = old.score >= ON_TARGET;
    const text =
      verdict === 'better'
        ? `${now} now, ${before} last time. ${inRange ? (wasInRange ? `Closer to the middle of the target (${range}).` : `It is now inside the target (${range}).`) : `Closer to the target (${range}), not there yet.`}`
        : verdict === 'worse'
          ? `${now} now, ${before} last time. ${inRange ? `Still inside the target (${range}), but nearer its edge.` : wasInRange ? `It has moved outside the target (${range}).` : `Further from the target (${range}).`} ${m.tip}`
          : `Steady at ${now}${inRange ? `, inside the target (${range}).` : `. The target is ${range}. ${m.tip}`}`;
    changes.push({ key: m.key, label: m.label, verdict, now: m.score, before: old.score, text });
  }

  const overallNow = Math.round(current.overall);
  const overallBefore = Math.round(previous.overall);
  const overall = verdictFor(overallNow, overallBefore);
  const diff = Math.abs(overallNow - overallBefore);
  const headline =
    overall === 'better' ? `Overall ${overallNow}, up ${diff} from ${overallBefore} last time.`
    : overall === 'worse' ? `Overall ${overallNow}, down ${diff} from ${overallBefore} last time. One session is not a trend.`
    : `Overall ${overallNow}, about the same as last time (${overallBefore}).`;

  // Biggest moves first, so the most important change leads each list
  const by = (v: Verdict) => changes.filter((c) => c.verdict === v).sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before));
  return { when: previous.createdAt ?? null, overallNow, overallBefore, overall, headline, better: by('better'), worse: by('worse'), same: by('same') };
}

// ── The trend across several analyses ────────────────────────────────────────────────────────────

export type Direction = 'improving' | 'slipping' | 'steady' | 'mixed';
export type Trend = {
  /** Overall marks, oldest first, ending with the current one */
  marks: number[];
  direction: Direction;
  text: string;
  /** The measures moving most, each with its marks oldest first */
  measures: Array<{ key: string; label: string; direction: Direction; marks: number[]; text: string }>;
};

/** A trend needs at least this many analyses, counting the current one. */
export const TREND_MIN = 3;
/** Marks gained or lost per session before a run of sessions counts as moving. */
const SLOPE = 1.5;
/** The gap between best and worst that makes a flat run "up and down" instead of steady. */
const SWING = 10;

/** Which way a run of marks is heading: the slope of the straight line through them. */
export function directionOf(marks: number[]): Direction {
  const n = marks.length;
  if (n < 2) return 'steady';
  const meanX = (n - 1) / 2;
  const meanY = marks.reduce((a, b) => a + b, 0) / n;
  const slope = marks.reduce((sum, y, x) => sum + (x - meanX) * (y - meanY), 0) / marks.reduce((sum, _, x) => sum + (x - meanX) ** 2, 0);
  if (slope >= SLOPE) return 'improving';
  if (slope <= -SLOPE) return 'slipping';
  return Math.max(...marks) - Math.min(...marks) >= SWING ? 'mixed' : 'steady';
}

const DIRECTION_WORDS: Record<Direction, string> = {
  improving: 'Improving.', slipping: 'Slipping, so this is the one to work on.', steady: 'Holding steady.', mixed: 'Up and down, so not settled yet.',
};

/**
 * The run of marks across the current analysis and the ones before it (`earlier` is newest
 * first, as the history comes). Null when there are too few to call a trend.
 */
export function trendOver(current: { overall: number; metrics: MetricResult[] }, earlier: SavedAnalysis[]): Trend | null {
  if (earlier.length + 1 < TREND_MIN) return null;
  const past = [...earlier].reverse();
  const marks = [...past.map((p) => Math.round(p.overall)), Math.round(current.overall)];
  const direction = directionOf(marks);
  const overallWords: Record<Direction, string> = {
    improving: 'You are improving.', slipping: 'It has been slipping. Go back to the measure at the top of the list below.', steady: 'You are holding steady.', mixed: 'It has been up and down.',
  };

  const measures: Trend['measures'] = [];
  for (const m of current.metrics) {
    if (m.excused) continue;
    const run = past.map((p) => p.metrics.find((x) => x.key === m.key && !x.excused)?.score);
    // Only measures taken every time have a run worth describing
    if (run.some((v) => v === undefined)) continue;
    const series = [...(run as number[]).map(Math.round), Math.round(m.score)];
    const d = directionOf(series);
    if (d === 'steady') continue;
    measures.push({ key: m.key, label: m.label, direction: d, marks: series, text: `${series.join(', ')}. ${DIRECTION_WORDS[d]}` });
  }
  // What is slipping comes first, then what is improving, biggest swing first within each
  const order: Direction[] = ['slipping', 'mixed', 'improving'];
  const swing = (x: { marks: number[] }) => Math.abs(x.marks[x.marks.length - 1] - x.marks[0]);
  measures.sort((a, b) => order.indexOf(a.direction) - order.indexOf(b.direction) || swing(b) - swing(a));

  return { marks, direction, text: `Your last ${marks.length}: ${marks.join(', ')}. ${overallWords[direction]}`, measures: measures.slice(0, 4) };
}

// ── Rebuilding a saved analysis ──────────────────────────────────────────────────────────────────

/** A saved analysis with each measure's target, unit and tip put back, ready to compare. */
export function rebuild(saved: SavedAnalysis): { overall: number; metrics: MetricResult[] } {
  const mode = (saved.mode === 'bowling' ? 'bowling' : 'batting') as Mode;
  const view = (saved.view === 'front' ? 'front' : 'side') as View;
  const metrics: MetricResult[] = [];
  for (const m of saved.metrics) {
    const def = metricDefFor(m.key, mode, view, (saved.shotType ?? undefined) as ShotType | undefined);
    if (def) metrics.push({ ...def, value: m.value, score: m.score, excused: m.excused });
  }
  return { overall: saved.overall, metrics };
}

/** "Batting · drive · side-on" */
export function describeKind(a: { mode: string; view?: string; shotType?: string | null }): string {
  const shot = a.mode === 'batting' && a.shotType ? (SHOT_TYPE_LABELS[a.shotType as ShotType] ?? a.shotType).replace(/^\S+\s/, '') : null;
  return [a.mode === 'bowling' ? 'Bowling' : 'Batting', shot, a.view === 'front' ? 'front-on' : 'side-on'].filter(Boolean).join(' · ');
}

/** Everything to show for one kind of analysis: the newest against the one before, and the run. */
export type Progress = { kind: string; when: string | null; sessions: number; overall: number; comparison: Comparison | null; trend: Trend | null };

/** Groups a person's saved analyses (newest first) by kind and works out the progress in each. */
export function progressByKind(saved: SavedAnalysis[]): Progress[] {
  const groups: SavedAnalysis[][] = [];
  for (const s of saved) {
    const group = groups.find((g) => sameKind(g[0], s));
    if (group) group.push(s); else groups.push([s]);
  }
  return groups.map((g) => {
    const latest = rebuild(g[0]);
    const earlier = g.slice(1, 5);
    return {
      kind: describeKind(g[0]), when: g[0].createdAt ?? null, sessions: g.length, overall: Math.round(g[0].overall),
      comparison: earlier.length > 0 ? compareAnalyses(latest, earlier[0]) : null,
      trend: trendOver(latest, earlier),
    };
  });
}
