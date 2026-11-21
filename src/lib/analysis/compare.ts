// Compares one technique analysis with the last one of the same kind (same discipline, same
// camera view and, for batting, the same shot) and says in plain words what got better, what
// slipped and what held steady. No AI: every sentence comes straight from the two sets of marks,
// so it can never claim an improvement the numbers do not show.

import { ON_TARGET, formatRange, formatValue, type MetricResult } from './pose-metrics';

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
