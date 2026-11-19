// Pure. Finds the separate shots in a longer batting clip, so a net session can be marked one shot
// at a time instead of as a single blur. A shot shows up as a burst of hand speed: the swing. Each
// burst becomes a window of frames around it, wide enough to hold the backswing and follow-through.
// Shots with almost no swing (a leave, a soft block) will not be found; that is a known limit.

import { sample, type Sample } from './shot-detect';
import type { Landmark } from './pose-metrics';

export type ShotWindow = {
  /** First and last frame of the shot (inclusive), and the frame where the hands were fastest */
  start: number;
  end: number;
  peak: number;
};

/** Hand speed, in torso lengths a second, that counts as a swing */
const MIN_SWING_SPEED = 2.5;
/** Two bursts closer together than this are the same shot (seconds) */
const MIN_GAP = 1.5;
/** How much of the clip to keep before and after the fastest moment (seconds) */
const BEFORE = 1.2;
const AFTER = 0.8;
/** A shot needs at least this many frames to be marked */
const MIN_FRAMES_IN_SHOT = 8;

/** The shots in a clip, in order. `times` is when each frame was seen, in seconds. */
export function splitShots(frames: Landmark[][], times: number[], w: number, h: number): ShotWindow[] {
  const n = Math.min(frames.length, times.length);
  if (n < MIN_FRAMES_IN_SHOT) return [];
  const samples: (Sample | null)[] = frames.slice(0, n).map((f) => sample(f, w, h));

  // Hand speed between neighbouring frames. A gap in the footage or a lost body counts as still.
  const raw = new Array<number>(n).fill(0);
  for (let i = 1; i < n; i++) {
    const a = samples[i - 1], b = samples[i];
    const dt = times[i] - times[i - 1];
    if (!a || !b || !(dt > 0) || dt > 0.25) continue;
    raw[i] = Math.hypot(b.hands.x - a.hands.x, b.hands.y - a.hands.y) / dt;
  }
  // Averaged over three frames so one jumpy reading is not mistaken for a swing
  const speed = raw.map((_, i) => (raw[Math.max(0, i - 1)] + raw[i] + raw[Math.min(n - 1, i + 1)]) / 3);

  const fastest = Math.max(...speed);
  const bar = Math.max(MIN_SWING_SPEED, fastest * 0.35);

  // The fastest moment of each burst, keeping the stronger of any two that are too close together
  const peaks: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (speed[i] < bar || speed[i] < speed[i - 1] || speed[i] < speed[i + 1]) continue;
    const last = peaks[peaks.length - 1];
    if (last !== undefined && times[i] - times[last] < MIN_GAP) {
      if (speed[i] > speed[last]) peaks[peaks.length - 1] = i;
    } else peaks.push(i);
  }

  return peaks.map((peak, k) => {
    // Never reach past the halfway point to the next shot
    const from = Math.max(times[peak] - BEFORE, k > 0 ? (times[peaks[k - 1]] + times[peak]) / 2 : -Infinity);
    const to = Math.min(times[peak] + AFTER, k < peaks.length - 1 ? (times[peak] + times[peaks[k + 1]]) / 2 : Infinity);
    let start = peak, end = peak;
    while (start > 0 && times[start - 1] >= from) start--;
    while (end < n - 1 && times[end + 1] <= to) end++;
    return { start, end, peak };
  }).filter((shot) => shot.end - shot.start + 1 >= MIN_FRAMES_IN_SHOT);
}

/** "0:14" for a moment in a clip. */
export function clipTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Which shots to point out: the highest score, and the one with most room to improve. With fewer
 * than two shots, or when every shot scored the same, there is nothing to single out.
 */
export function bestAndWorst(scores: number[]): { best: number; toWorkOn: number } | null {
  if (scores.length < 2) return null;
  let best = 0, low = 0;
  scores.forEach((score, i) => {
    if (score > scores[best]) best = i;
    if (score < scores[low]) low = i;
  });
  return scores[best] === scores[low] ? null : { best, toWorkOn: low };
}
