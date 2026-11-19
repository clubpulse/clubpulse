// Pure. Finds the separate shots in a longer batting clip, so a net session can be marked one shot
// at a time instead of as a single blur. A shot shows up as a burst of hand speed: the swing. Each
// burst becomes a window of frames around it, wide enough to hold the backswing and follow-through.
// A second, gentler pass picks up soft shots (a block, a push) well away from any full swing. A
// leave has no hand movement to find, so the screen also lets the player mark a shot by hand.
//
// Bowling is split the same way by the bowling hand coming over above the shoulder.

import { sample, type Sample } from './shot-detect';
import { L, MIN_VISIBILITY, type Landmark } from './pose-metrics';

export type ShotWindow = {
  /** First and last frame of the shot (inclusive), and the frame where the hands were fastest */
  start: number;
  end: number;
  peak: number;
};

/** Hand speed that counts as a soft shot, how far the hands must travel in it, and how clear of a full swing it must be */
const MIN_SOFT_SPEED = 1.2;
const MIN_SOFT_TRAVEL = 0.3;
const SOFT_CLEARANCE = 2.5;
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

  // Soft shots: a slower burst where the hands still clearly go somewhere, away from any full swing
  const soft: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    if (speed[i] < MIN_SOFT_SPEED || speed[i] >= bar || speed[i] < speed[i - 1] || speed[i] < speed[i + 1]) continue;
    if (peaks.some((p) => Math.abs(times[p] - times[i]) < SOFT_CLEARANCE)) continue;
    let from = i, to = i;
    while (from > 0 && times[i] - times[from - 1] <= 0.4) from--;
    while (to < n - 1 && times[to + 1] - times[i] <= 0.4) to++;
    const a = samples[from], b = samples[to];
    if (!a || !b || Math.hypot(b.hands.x - a.hands.x, b.hands.y - a.hands.y) < MIN_SOFT_TRAVEL) continue;
    const last = soft[soft.length - 1];
    if (last !== undefined && times[i] - times[last] < SOFT_CLEARANCE) {
      if (speed[i] > speed[last]) soft[soft.length - 1] = i;
    } else soft.push(i);
  }

  return windows([...peaks, ...soft].sort((x, y) => x - y), times, n, BEFORE, AFTER);
}

/** A window of frames around each moment, never reaching past halfway to its neighbours. */
function windows(peaks: number[], times: number[], n: number, before: number, after: number): ShotWindow[] {
  return peaks.map((peak, k) => {
    const from = Math.max(times[peak] - before, k > 0 ? (times[peaks[k - 1]] + times[peak]) / 2 : -Infinity);
    const to = Math.min(times[peak] + after, k < peaks.length - 1 ? (times[peak] + times[peaks[k + 1]]) / 2 : Infinity);
    let start = peak, end = peak;
    while (start > 0 && times[start - 1] >= from) start--;
    while (end < n - 1 && times[end + 1] <= to) end++;
    return { start, end, peak };
  }).filter((shot) => shot.end - shot.start + 1 >= MIN_FRAMES_IN_SHOT);
}

/** The window for a shot or delivery the player marked by hand at one frame. */
export function windowAround(times: number[], index: number, mode: 'batting' | 'bowling'): ShotWindow {
  const at = Math.max(0, Math.min(times.length - 1, index));
  const before = mode === 'bowling' ? BOWL_BEFORE : BEFORE;
  const after = mode === 'bowling' ? BOWL_AFTER : AFTER;
  let start = at, end = at;
  while (start > 0 && times[at] - times[start - 1] <= before) start--;
  while (end < times.length - 1 && times[end + 1] - times[at] <= after) end++;
  return { start, end, peak: at };
}

/** How much of the clip to keep around a release: the gather and delivery stride before, the follow-through after */
const BOWL_BEFORE = 2.0;
const BOWL_AFTER = 0.8;
/** Two releases closer together than this are the same ball (seconds) */
const BOWL_GAP = 2.5;

/**
 * The deliveries in a bowling clip, in order. A delivery is the bowling hand coming over: clearly
 * above its shoulder on a reaching arm. `peak` is the frame where the hand was highest.
 */
export function splitDeliveries(frames: Landmark[][], times: number[], hand: 'right' | 'left', w: number, h: number): ShotWindow[] {
  const n = Math.min(frames.length, times.length);
  const wristId = hand === 'right' ? L.rWrist : L.lWrist;
  const shoulderId = hand === 'right' ? L.rShoulder : L.lShoulder;
  const ok = (lm: Landmark[], ...ids: number[]) => ids.every((i) => lm[i] && (lm[i].visibility ?? 1) >= MIN_VISIBILITY);
  // How high the bowling hand is above its shoulder, in torso lengths; 0 when it is not a reaching arm
  const height = frames.slice(0, n).map((lm) => {
    if (!ok(lm, L.lShoulder, L.rShoulder, L.lHip, L.rHip, wristId)) return 0;
    const px = (i: number) => ({ x: lm[i].x * w, y: lm[i].y * h });
    const torso = Math.hypot(
      (px(L.lShoulder).x + px(L.rShoulder).x - px(L.lHip).x - px(L.rHip).x) / 2,
      (px(L.lShoulder).y + px(L.rShoulder).y - px(L.lHip).y - px(L.rHip).y) / 2,
    );
    if (!(torso > 1)) return 0;
    const wrist = px(wristId), shoulder = px(shoulderId);
    const up = (shoulder.y - wrist.y) / torso;
    return up >= 0.15 && Math.hypot(wrist.x - shoulder.x, wrist.y - shoulder.y) / torso >= 0.6 ? up : 0;
  });

  const peaks: number[] = [];
  for (let i = 0; i < n; i++) {
    if (height[i] <= 0 || height[i] < (height[i - 1] ?? 0) || height[i] < (height[i + 1] ?? 0)) continue;
    const last = peaks[peaks.length - 1];
    if (last !== undefined && times[i] - times[last] < BOWL_GAP) {
      if (height[i] > height[last]) peaks[peaks.length - 1] = i;
    } else peaks.push(i);
  }
  return windows(peaks, times, n, BOWL_BEFORE, BOWL_AFTER);
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
