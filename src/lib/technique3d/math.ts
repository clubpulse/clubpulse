import type { PoseFrame, TechniqueHand, Vec3 } from './types';
import { POSE_LANDMARKS } from './types';

const DEG = Math.PI / 180;

export function rotY(v: Vec3, degrees: number): Vec3 {
  const a = degrees * DEG;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function roundVec(v: Vec3): Vec3 {
  return [round4(v[0]), round4(v[1]), round4(v[2])];
}

function round4(n: number): number {
  const rounded = Math.round(n * 10000) / 10000;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Interior angle at `b`, in degrees. 180 is straight. */
export function jointAngle(a: Vec3, b: Vec3, c: Vec3): number | null {
  const u = sub(a, b);
  const v = sub(c, b);
  const size = Math.hypot(...u) * Math.hypot(...v);
  if (size < 1e-8) return null;
  const cos = Math.min(1, Math.max(-1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / size));
  return (Math.acos(cos) * 180) / Math.PI;
}

const FRONT = { right: { elbow: [11, 13, 15], knee: [23, 25, 27] }, left: { elbow: [12, 14, 16], knee: [24, 26, 28] } } as const;

export function frontElbow(frame: PoseFrame, hand: TechniqueHand): number | null {
  const [a, b, c] = FRONT[hand].elbow;
  if (!frame[a] || !frame[b] || !frame[c]) return null;
  return jointAngle(frame[a], frame[b], frame[c]);
}

export function frontKnee(frame: PoseFrame, hand: TechniqueHand): number | null {
  const [a, b, c] = FRONT[hand].knee;
  if (!frame[a] || !frame[b] || !frame[c]) return null;
  return jointAngle(frame[a], frame[b], frame[c]);
}

/** Signed degrees between the shoulder line and the hip line, seen from above. */
export function shoulderHipSeparation(frame: PoseFrame): number | null {
  if (!frame[11] || !frame[12] || !frame[23] || !frame[24]) return null;
  const shoulder = sub(frame[12], frame[11]);
  const hip = sub(frame[24], frame[23]);
  const dot = shoulder[0] * hip[0] + shoulder[2] * hip[2];
  const cross = shoulder[0] * hip[2] - shoulder[2] * hip[0];
  if (Math.hypot(shoulder[0], shoulder[2]) < 1e-6 || Math.hypot(hip[0], hip[2]) < 1e-6) return null;
  return (Math.atan2(cross, dot) * 180) / Math.PI;
}

export type AngleRead = { frontElbow: number | null; frontKnee: number | null; shoulderHip: number | null };

export function anglesAt(frame: PoseFrame, hand: TechniqueHand): AngleRead {
  return {
    frontElbow: frontElbow(frame, hand),
    frontKnee: frontKnee(frame, hand),
    shoulderHip: shoulderHipSeparation(frame),
  };
}

/** Flip a clip so the nose sits above the hips. Two axes flip together, so left and right stay put. */
export function orientFrames(frames: PoseFrame[]): PoseFrame[] {
  const mid = frames[Math.floor(frames.length / 2)];
  if (!mid || mid.length < 25) return frames;
  const hipY = (mid[23][1] + mid[24][1]) / 2;
  if (mid[0][1] >= hipY) return frames;
  return frames.map((frame) => frame.map(([x, y, z]) => [x, -y, -z] as Vec3));
}

export function frameIndexAt(times: number[], time: number): number {
  if (times.length === 0) return 0;
  let best = 0;
  let dist = Infinity;
  for (let i = 0; i < times.length; i++) {
    const d = Math.abs(times[i] - time);
    if (d < dist) { dist = d; best = i; }
  }
  return best;
}

export function alignedReferenceIndex(playerIndex: number, playerEvent: number, referenceEvent: number, referenceLength: number): number | null {
  const index = playerIndex - playerEvent + referenceEvent;
  if (index < 0 || index >= referenceLength) return null;
  return index;
}

function shoulderYaw(frame: PoseFrame): number | null {
  if (!frame[11] || !frame[12]) return null;
  const line = sub(frame[12], frame[11]);
  if (Math.hypot(line[0], line[2]) < 1e-6) return null;
  return Math.atan2(line[2], line[0]);
}

/** Degrees to rotate `from` around vertical so its shoulders face like `to`. */
export function yawDelta(from: PoseFrame, to: PoseFrame): number {
  const a = shoulderYaw(from);
  const b = shoulderYaw(to);
  if (a === null || b === null) return 0;
  return ((b - a) * 180) / Math.PI;
}

export function rotateFrameY(frame: PoseFrame, degrees: number): PoseFrame {
  return frame.map((point) => rotY(point, degrees));
}

export function isPoseFrame(value: unknown): value is PoseFrame {
  if (!Array.isArray(value) || value.length !== POSE_LANDMARKS) return false;
  return value.every((point) => Array.isArray(point) && point.length === 3 && point.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 6));
}
