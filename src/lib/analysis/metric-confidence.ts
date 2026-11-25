/**
 * How much to trust one scored number, on top of the whole-clip gate.
 * A low result is not shown as a confident figure and is left out of the overall score.
 */
export type Reading = 'high' | 'medium' | 'low';

export const UNMEASURED_MESSAGE = "Couldn't measure this clearly — try filming closer / brighter";

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
