import { armLift, kneeAngle, type PosePoint } from './pose';

export type SquatReading = { reps: number; deepest: number; form: number };

/**
 * Counts a squat only after the knee bends to the depth line and then straightens again.
 * Form is 1 when the deepest bend reaches the line, and less when it stays shallow.
 */
export function countSquats(angles: number[], depth = 110, stand = 155): SquatReading {
  let reps = 0;
  let descending = false;
  let reached = false;
  let deepest = 180;
  for (const angle of angles) {
    if (!Number.isFinite(angle)) continue;
    deepest = Math.min(deepest, angle);
    if (!descending && angle < 145) descending = true;
    if (descending && angle <= depth) reached = true;
    if (descending && angle >= stand) {
      if (reached) reps += 1;
      descending = false;
      reached = false;
    }
  }
  const span = stand - depth;
  const form = span <= 0 ? 0 : Math.min(1, Math.max(0, (stand - deepest) / span));
  return { reps, deepest, form };
}

export function squatAngles(frames: PosePoint[][]): number[] {
  return frames.map((frame) => kneeAngle(frame, 'left') ?? kneeAngle(frame, 'right') ?? Number.NaN).filter((n) => Number.isFinite(n));
}

/** Seconds the free foot stays clearly off the ground. y grows downward, so a lifted foot has a smaller y. */
export function balanceHoldSeconds(samples: Array<{ freeY: number; standY: number; t: number }>, lift = 0.06): number {
  let held = 0;
  let from: number | null = null;
  for (const sample of samples) {
    const up = sample.standY - sample.freeY >= lift;
    if (up && from === null) from = sample.t;
    if (!up && from !== null) {
      held += Math.max(0, sample.t - from);
      from = null;
    }
  }
  const last = samples[samples.length - 1];
  if (from !== null && last) held += Math.max(0, last.t - from);
  return Math.round(held * 10) / 10;
}

export function shoulderRange(frames: PosePoint[][]): { range: number; form: number } {
  const lifts = frames.flatMap((frame) => [armLift(frame, 'left'), armLift(frame, 'right')].filter((n): n is number => n !== null));
  if (lifts.length < 2) return { range: 0, form: 0 };
  const range = Math.max(...lifts) - Math.min(...lifts);
  return { range: Math.round(range), form: Math.min(1, range / 120) };
}

/**
 * A jump rep is both feet leaving the ground and coming back. Flight time is the seconds
 * the ankles stay above the standing height. This is a light proxy, not a lab measurement.
 */
export function countJumps(samples: Array<{ ankleY: number; t: number }>, ground: number, lift = 0.04): { reps: number; flight: number; form: number } {
  let reps = 0;
  let airborne = false;
  let leftAt = 0;
  let flight = 0;
  let best = 0;
  for (const sample of samples) {
    const up = ground - sample.ankleY >= lift;
    if (up && !airborne) {
      airborne = true;
      leftAt = sample.t;
    }
    if (!up && airborne) {
      const dt = Math.max(0, sample.t - leftAt);
      flight += dt;
      best = Math.max(best, dt);
      reps += 1;
      airborne = false;
    }
  }
  return { reps, flight: Math.round(flight * 100) / 100, form: Math.min(1, best / 0.25) };
}
