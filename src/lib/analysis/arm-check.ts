/**
 * Rule-based check on the bowling arm around release. There is no trained model.
 * A frame is kept when the upper arm and forearm stay near their usual lengths and the
 * elbow angle does not jump away from the rest of the window. The 45° misses on a raised
 * arm are the frames this drops.
 */
export type ArmSample = { angle: number; upper: number; fore: number };

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function consistentArmAngle(samples: ArmSample[]): { angle: number | null; unreliable: boolean } {
  const usable = samples.filter((sample) => Number.isFinite(sample.angle) && sample.upper > 1 && sample.fore > 1);
  if (usable.length === 0) return { angle: null, unreliable: true };
  const upper = median(usable.map((sample) => sample.upper));
  const fore = median(usable.map((sample) => sample.fore));
  const lengthOk = (sample: ArmSample) => Math.abs(sample.upper - upper) / upper <= 0.25
    && Math.abs(sample.fore - fore) / fore <= 0.25;
  const fitted = usable.filter(lengthOk);
  const pool = fitted.length > 0 ? fitted : usable;
  const centre = median(pool.map((sample) => sample.angle));
  const steady = pool.filter((sample) => Math.abs(sample.angle - centre) <= 20);
  const chosen = steady.length > 0 ? steady : pool;
  const unreliable = fitted.length < Math.ceil(usable.length * 0.5) || steady.length < Math.ceil(pool.length * 0.5);
  return { angle: median(chosen.map((sample) => sample.angle)), unreliable };
}
