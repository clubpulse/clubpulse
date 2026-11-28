import type { AlignEvent, PoseFrame, TechniqueHand, TechniqueMode } from './types';

/** A moment in the clip, between frames. `frame` is fractional: 12.4 is 40% of the way from frame 12 to frame 13. */
export type EventTiming = { frame: number; time: number; /** True when a clear peak was found; false when the clip gave no clean one and the nearest frame was used. */ clean: boolean };
export type PreciseEvents = Partial<Record<AlignEvent, EventTiming>>;

const LANDMARK = {
  right: { back: 28, front: 27, wrist: 16 },
  left: { back: 27, front: 28, wrist: 15 },
} as const;

/** Time at a fractional frame, from the frame times. */
export function timeAtFrame(times: number[], frame: number): number {
  if (times.length === 0) return 0;
  const clamped = Math.min(Math.max(frame, 0), times.length - 1);
  const i = Math.floor(clamped);
  const next = Math.min(times.length - 1, i + 1);
  return times[i] + (times[next] - times[i]) * (clamped - i);
}

/** Frames in a quarter-second-ish half window, so a 120 fps clip is not noisier than a 30 fps one. At least one frame either side. */
export function halfWindow(times: number[], seconds = 0.025): number {
  if (times.length < 2) return 1;
  const dt = (times[times.length - 1] - times[0]) / (times.length - 1);
  return dt > 0 ? Math.max(1, Math.round(seconds / dt)) : 1;
}

function derivative(values: number[], times: number[]): number[] {
  const out = new Array<number>(values.length).fill(0);
  const h = halfWindow(times);
  for (let i = 0; i < values.length; i++) {
    const a = Math.max(0, i - h);
    const b = Math.min(values.length - 1, i + h);
    const dt = times[b] - times[a];
    out[i] = dt > 0 ? (values[b] - values[a]) / dt : 0;
  }
  return out;
}

/** Fractional position of the top of a peak, from the point and its two neighbours (a parabola through three samples). */
export function parabolicPeak(values: number[], i: number): number {
  if (i <= 0 || i >= values.length - 1) return i;
  const a = values[i - 1];
  const b = values[i];
  const c = values[i + 1];
  const denom = a - 2 * b + c;
  if (Math.abs(denom) < 1e-12) return i;
  const shift = (0.5 * (a - c)) / denom;
  return i + Math.max(-0.5, Math.min(0.5, shift));
}

function argMax(values: number[], from = 0, to = values.length): number {
  let at = from;
  for (let i = from; i < to; i++) if (values[i] > values[at]) at = i;
  return at;
}

function wristSpeed(frames: PoseFrame[], times: number[], wrist: number): number[] {
  const out = new Array<number>(frames.length).fill(0);
  const h = halfWindow(times);
  for (let i = 0; i < frames.length; i++) {
    const a = frames[Math.max(0, i - h)][wrist];
    const b = frames[Math.min(frames.length - 1, i + h)][wrist];
    const dt = times[Math.min(frames.length - 1, i + h)] - times[Math.max(0, i - h)];
    out[i] = a && b && dt > 0 ? Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / dt : 0;
  }
  return out;
}

/**
 * Key moments from velocity peaks, between frames:
 *  - back-foot contact: the lowest point of the back ankle, found as the top of a parabola through three samples;
 *  - front-foot contact: the front ankle is coming down at its fastest, then stops. The moment is where its downward
 *    speed has fallen to half of that peak, found by interpolating between two frames;
 *  - release or bat-ball contact: the peak of the wrist's speed, again as a parabola top.
 * The same motion filmed at 30 and at 120 frames a second gives times within one 30 fps frame of each other.
 * `times` are the clip times of `frames`, which are in metres, hip-centred, y up.
 */
/** Top of the wrist-speed peak. A fitted curve over about 0.16 s, so noise on a flat-topped peak does not move it by a frame at 120 fps. */
function speedPeak(speeds: number[], times: number[], top: number): number {
  const fitted = valleyFit(speeds.map((v) => -v), times, top, 0.08);
  return Number.isFinite(fitted) && fitted !== top ? fitted : parabolicPeak(speeds, top);
}

export function detectEventsPrecise(frames: PoseFrame[], times: number[], mode: TechniqueMode, hand: TechniqueHand): PreciseEvents {
  if (frames.length < 5 || times.length !== frames.length) return {};
  const { back, front, wrist } = LANDMARK[hand];
  const n = frames.length;
  const backY = frames.map((f) => f[back]?.[1] ?? 0);
  const frontY = frames.map((f) => f[front]?.[1] ?? 0);

  // Back foot: the lowest point of its first dip, which is before the front foot lands.
  const frontVy = derivative(frontY, times);
  const down = frontVy.map((v) => -v);
  const fastestDown = argMax(down, 0, n);
  const searchTo = Math.max(3, Math.min(n, fastestDown + 1));
  let lowBack = 1;
  for (let i = 1; i < Math.max(2, searchTo); i++) if (backY[i] < backY[lowBack]) lowBack = i;
  // Prefer a real dip over the first frame. "Real" is judged over about 0.05 s either side, so noise at 120 fps is not one.
  const w = halfWindow(times, 0.05);
  for (let i = w; i < n - w; i++) {
    let leftTop = backY[i];
    let rightTop = backY[i];
    let isLow = true;
    for (let k = 1; k <= w; k++) {
      if (backY[i - k] < backY[i] || backY[i + k] < backY[i]) { isLow = false; break; }
      leftTop = Math.max(leftTop, backY[i - k]);
      rightTop = Math.max(rightTop, backY[i + k]);
    }
    if (isLow && leftTop - backY[i] >= 0.01 && rightTop - backY[i] >= 0.01) { lowBack = i; break; }
  }
  const backFrame = valleyFit(backY, times, lowBack);

  // Front foot: half-speed point on the trailing edge of the fastest downward movement.
  let frontFrame = fastestDown;
  let frontClean = false;
  const peak = down[fastestDown];
  if (peak > 0.05) {
    const half = peak * 0.5;
    for (let i = fastestDown; i < n - 1; i++) {
      if (down[i] >= half && down[i + 1] < half) {
        frontFrame = i + (down[i] - half) / (down[i] - down[i + 1]);
        frontClean = true;
        break;
      }
    }
  }

  const speeds = wristSpeed(frames, times, wrist);
  if (mode === 'bowling') {
    const from = Math.min(n - 1, Math.max(0, Math.floor(frontFrame)));
    const top = argMax(speeds, from, n);
    const releaseFrame = speedPeak(speeds, times, top);
    return {
      back_foot_contact: { frame: backFrame, time: timeAtFrame(times, backFrame), clean: true },
      front_foot_contact: { frame: frontFrame, time: timeAtFrame(times, frontFrame), clean: frontClean },
      release: { frame: releaseFrame, time: timeAtFrame(times, releaseFrame), clean: speeds[top] > 0.5 },
    };
  }
  const top = argMax(speeds, 0, n);
  const contactFrame = speedPeak(speeds, times, top);
  return {
    back_foot_contact: { frame: backFrame, time: timeAtFrame(times, backFrame), clean: true },
    front_foot_contact: { frame: frontFrame, time: timeAtFrame(times, frontFrame), clean: frontClean },
    bat_ball_contact: { frame: contactFrame, time: timeAtFrame(times, contactFrame), clean: speeds[top] > 0.5 },
  };
}

/**
 * Lowest point of a dip, from a least-squares parabola over about a tenth of a second either side. Three samples are too
 * noisy at 120 fps, where the dip is a few millimetres deep from one frame to the next.
 */
export function valleyFit(values: number[], times: number[], i: number, seconds = 0.1): number {
  const lo: number[] = [];
  for (let k = 0; k < values.length; k++) if (Math.abs(times[k] - times[i]) <= seconds) lo.push(k);
  if (lo.length < 3) return i;
  const t0 = times[i];
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, y0 = 0, y1 = 0, y2 = 0;
  for (const k of lo) {
    const x = times[k] - t0;
    const y = values[k];
    s0 += 1; s1 += x; s2 += x * x; s3 += x ** 3; s4 += x ** 4;
    y0 += y; y1 += x * y; y2 += x * x * y;
  }
  // Solve [s4 s3 s2; s3 s2 s1; s2 s1 s0] [a b c] = [y2 y1 y0]
  const m = [[s4, s3, s2, y2], [s3, s2, s1, y1], [s2, s1, s0, y0]];
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    if (Math.abs(m[pivot][col]) < 1e-18) return i;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = m[r][col] / m[col][col];
      for (let c = col; c < 4; c++) m[r][c] -= f * m[col][c];
    }
  }
  const a = m[0][3] / m[0][0];
  const b = m[1][3] / m[1][1];
  if (!(a > 0)) return i; // not a dip
  const vertex = t0 + -b / (2 * a);
  // Back to a fractional frame number
  const nearest = (() => { let best = 0; for (let k = 1; k < times.length; k++) if (Math.abs(times[k] - vertex) < Math.abs(times[best] - vertex)) best = k; return best; })();
  const next = vertex >= times[nearest] ? Math.min(times.length - 1, nearest + 1) : Math.max(0, nearest - 1);
  const span = times[next] - times[nearest];
  const frac = span !== 0 ? (vertex - times[nearest]) / span : 0;
  return Math.min(Math.max(nearest + (next - nearest) * frac, 0), times.length - 1);
}

/** Linear blend of two frames at a fractional position, for reading an angle at a moment between pictures. */
export function frameAtFractional(frames: PoseFrame[], frame: number): PoseFrame {
  const clamped = Math.min(Math.max(frame, 0), frames.length - 1);
  const i = Math.floor(clamped);
  const j = Math.min(frames.length - 1, i + 1);
  const w = clamped - i;
  return frames[i].map((p, k) => [
    p[0] + (frames[j][k][0] - p[0]) * w,
    p[1] + (frames[j][k][1] - p[1]) * w,
    p[2] + (frames[j][k][2] - p[2]) * w,
  ]);
}
