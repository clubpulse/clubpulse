/**
 * How much to trust one scored number, on top of the whole-clip gate.
 * A low result is not shown as a confident figure and is left out of the overall score.
 */
export type Reading = 'high' | 'medium' | 'low';

/** Shown instead of a number. A low-confidence metric never prints a figure. */
export const CLEAR_IMAGE = 'Clear image not obtained';

export const UNMEASURED_MESSAGE = CLEAR_IMAGE;

export type ClearReason = 'blur' | 'small' | 'angle' | 'hidden';

/** The readings a skill stands on. A miss here is worth a retake, not a quiet dash. */
const KEY_METRICS: Record<'bowling' | 'batting', Record<'side' | 'front', readonly string[]>> = {
  bowling: {
    side: ['armStraightness', 'frontKnee', 'headStability'],
    front: ['armHeight', 'headStability'],
  },
  batting: {
    side: ['headOverKnee', 'headStability'],
    front: ['headOverFront', 'headStability'],
  },
};

export function isKeyMetric(key: string, mode: 'bowling' | 'batting', view: 'side' | 'front'): boolean {
  return KEY_METRICS[mode][view].includes(key);
}

/** Why a low reading failed, so the retake line can name the real problem. */
export function clearReasonFrom(input: {
  visibility: number[];
  jumps: number[];
  playerSize?: number;
  viewMismatch?: boolean;
}): ClearReason {
  if ((input.playerSize ?? 1) < 0.36) return 'small';
  if (input.viewMismatch) return 'angle';
  const seen = input.visibility.filter((value) => Number.isFinite(value));
  const meanVis = seen.length ? seen.reduce((sum, value) => sum + value, 0) / seen.length : 0;
  const jump = input.jumps.length ? Math.max(...input.jumps) : 0;
  if (meanVis < 0.55) return 'hidden';
  if (jump > 0.45) return 'blur';
  return 'blur';
}

export function retakeLine(key: string, reason: ClearReason, view: 'side' | 'front'): string {
  if (reason === 'small') return 'You were too small: step closer so you fill most of the screen';
  if (reason === 'angle') {
    return view === 'front'
      ? 'Body was side-on: film from front-on for this check'
      : 'Body was front-on: film from the side for this check';
  }
  if (reason === 'hidden') return 'Joint hidden: make sure the whole body stays in view';
  const part = key.startsWith('arm') ? 'Arm' : key.toLowerCase().includes('knee') ? 'Knee' : key.toLowerCase().includes('head') ? 'Head' : 'It';
  return `${part} was blurred: film in brighter light, use slow-mo/60fps if available`;
}

export type RetakeMetric = { key: string; confidence?: string; clearReason?: ClearReason };

/**
 * One retake line for the important misses. The score stays when most of those
 * readings are still clear. It is hidden when half or more of them, or all of them, failed.
 */
export function retakePlan(
  metrics: RetakeMetric[],
  mode: 'bowling' | 'batting',
  view: 'side' | 'front',
  opts?: { playerSize?: number; viewMismatch?: boolean },
): { line: string | null; keyFails: string[]; others: string[]; withhold: boolean } {
  const keys = KEY_METRICS[mode][view];
  const present = metrics.filter((metric) => keys.includes(metric.key));
  const low = metrics.filter((metric) => metric.confidence === 'low');
  const keyFails = low.filter((metric) => keys.includes(metric.key));
  const others = low.filter((metric) => !keys.includes(metric.key)).map((metric) => metric.key);
  const reasonFor = (metric: RetakeMetric): ClearReason => {
    if ((opts?.playerSize ?? 1) < 0.36) return 'small';
    if (opts?.viewMismatch) return 'angle';
    return metric.clearReason ?? 'blur';
  };
  const rank: Record<ClearReason, number> = { small: 0, angle: 1, hidden: 2, blur: 3 };
  const ordered = [...keyFails].sort((a, b) => rank[reasonFor(a)] - rank[reasonFor(b)] || keys.indexOf(a.key) - keys.indexOf(b.key));
  const first = ordered[0];
  const failed = keyFails.length;
  const withhold = present.length > 0 && (failed === present.length || failed * 2 > present.length);
  return {
    line: first ? retakeLine(first.key, reasonFor(first), view) : null,
    keyFails: ordered.map((metric) => metric.key),
    others,
    withhold,
  };
}

export function judgeMetric(input: {
  /** Mean visibility of the joints this measure uses, 0 to 1, one number per frame in the window. */
  visibility: number[];
  /** How far the joint jumped from the previous frame, in trunk lengths. */
  jumps: number[];
  /** Largest minus smallest reading of the measure across the window. Null when there is only one. */
  spread: number | null;
  /** How wide a spread is still the same position, in the measure's own units. */
  spreadLimit: number;
}): Reading {
  const seen = input.visibility.filter((value) => Number.isFinite(value));
  const meanVis = seen.length ? seen.reduce((sum, value) => sum + value, 0) / seen.length : 0;
  const jump = input.jumps.length ? Math.max(...input.jumps) : 0;
  const spread = input.spread ?? 0;
  if (meanVis < 0.55 || jump > 0.45 || spread > input.spreadLimit) return 'low';
  if (meanVis < 0.75 || jump > 0.25 || spread > input.spreadLimit * 0.6) return 'medium';
  return 'high';
}

/** Indexes around a key frame, inclusive, kept inside the clip. */
export function heavyFrameIndexes(key: number, length: number, radius = 3): number[] {
  if (length <= 0) return [];
  const start = Math.max(0, key - radius);
  const end = Math.min(length - 1, key + radius);
  const indexes: number[] = [];
  for (let i = start; i <= end; i++) indexes.push(i);
  return indexes;
}

/** Phones and laptops that would stall on the heavy pose model stay on the lite one. */
export function preferLiteModel(env: { cores?: number; memory?: number; saveData?: boolean }): boolean {
  if (env.saveData) return true;
  if (env.cores != null && env.cores > 0 && env.cores <= 2) return true;
  if (env.memory != null && env.memory > 0 && env.memory <= 2) return true;
  return false;
}
