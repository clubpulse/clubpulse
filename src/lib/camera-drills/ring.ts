export const RING_CUE = 'Move more to fill the ring';
export const WARMUP_NOTE = 'Warm up first. Stop if you feel pain.';

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * The ring fills only as far as the movement is both complete and well formed.
 * A shallow squat or a short hold leaves the ring short, even if the timer ends.
 */
export function ringFill(done: number, target: number, form: number): number {
  if (!(target > 0)) return 0;
  return Math.round(clamp01(done / target) * clamp01(form) * 1000) / 1000;
}

export function ringCue(fill: number, form: number): string {
  if (fill >= 0.999) return 'Nice work';
  if (form < 0.7) return RING_CUE;
  return 'Keep going';
}
