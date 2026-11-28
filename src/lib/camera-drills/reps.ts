import { armLift, type PosePoint } from './pose';
import { SQUAT_CONFIG, bestKneeAngle, countCycles, depthForm } from './rep-counter';

export type SquatReading = { reps: number; deepest: number; form: number; partials: number };

/**
 * Counts a rep only after the angle falls to the depth line and then rises back to standing (a full down-and-up
 * cycle). The gap between the depth line and the standing line is a hysteresis band: a reading that wobbles
 * around either line cannot count twice. Form is 1 when the deepest bend reaches the line, less when it stays shallow.
 */
export function countSquats(angles: number[], depth = SQUAT_CONFIG.down, stand = SQUAT_CONFIG.up): SquatReading {
  const cfg = { ...SQUAT_CONFIG, down: depth, up: stand };
  const state = countCycles(angles, null, { ...cfg, minRepSeconds: 0 });
  return { reps: state.reps, partials: state.partials, deepest: state.deepest, form: depthForm(state.deepest, cfg) };
}

export function squatAngles(frames: PosePoint[][]): number[] {
  return frames.map((frame) => bestKneeAngle(frame) ?? Number.NaN).filter((n) => Number.isFinite(n));
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
