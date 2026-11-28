// Deterministic joint sequences for the camera drills. These are SYNTHETIC: generated from a squat or plank model with
// seeded noise, not recorded from a person. They stand in for recordings until real clips are checked on a phone.
import type { PosePoint } from '@/lib/camera-drills/pose';

export const FPS = 30;

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gauss(r: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(r(), 1e-9))) * Math.cos(2 * Math.PI * r());
}

/** A full 33-point frame for a side-on person whose knee interior angle is `knee` degrees. */
export function squatFrame(knee: number, opts: { noise?: number; r?: () => number; vis?: number; mirror?: boolean } = {}): PosePoint[] {
  const { noise = 0, r = rng(1), vis = 0.95, mirror = false } = opts;
  const rad = (knee * Math.PI) / 180;
  const frame: PosePoint[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, v: vis }));
  const set = (i: number, x: number, y: number) => {
    const jx = noise ? gauss(r) * noise : 0;
    const jy = noise ? gauss(r) * noise : 0;
    frame[i] = { x: mirror ? 1 - (x + jx) : x + jx, y: y + jy, v: vis };
  };
  for (const [side, dx] of [['l', 0], ['r', 0.02]] as const) {
    const ankle = { x: 0.5 + dx, y: 0.9 };
    const kneeP = { x: 0.5 + dx, y: 0.7 };
    const hip = { x: kneeP.x + 0.2 * Math.sin(rad), y: kneeP.y + 0.2 * Math.cos(rad) };
    const shoulder = { x: hip.x, y: hip.y - 0.25 };
    if (side === 'l') { set(27, ankle.x, ankle.y); set(25, kneeP.x, kneeP.y); set(23, hip.x, hip.y); set(11, shoulder.x, shoulder.y); }
    else { set(28, ankle.x, ankle.y); set(26, kneeP.x, kneeP.y); set(24, hip.x, hip.y); set(12, shoulder.x, shoulder.y); }
  }
  return frame;
}

/** Knee angle for `reps` squats: stand, go down to `depth`, come back up, rest. */
export function squatAngles(opts: { reps: number; depth: number; repSeconds: number; restSeconds?: number; standing?: number }): number[] {
  const { reps, depth, repSeconds, restSeconds = 1, standing = 172 } = opts;
  const out: number[] = [];
  const hold = (s: number) => { for (let i = 0; i < Math.round(s * FPS); i++) out.push(standing); };
  hold(restSeconds);
  for (let k = 0; k < reps; k++) {
    const n = Math.round(repSeconds * FPS);
    for (let i = 0; i < n; i++) out.push(standing - (standing - depth) * 0.5 * (1 - Math.cos((2 * Math.PI * i) / n)));
    hold(restSeconds);
  }
  return out;
}

export function timesFor(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i / FPS);
}

/** Side-on plank frame. `sag` bends the hips down, in degrees of the shoulder-hip-ankle angle lost from 180. */
export function plankFrame(opts: { sag?: number; vis?: number; upright?: boolean } = {}): PosePoint[] {
  const { sag = 0, vis = 0.95, upright = false } = opts;
  const frame: PosePoint[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, v: vis }));
  if (upright) {
    frame[11] = { x: 0.5, y: 0.2, v: vis }; frame[23] = { x: 0.5, y: 0.5, v: vis }; frame[27] = { x: 0.5, y: 0.9, v: vis };
    return frame;
  }
  const shoulder = { x: 0.2, y: 0.6 };
  const ankle = { x: 0.8, y: 0.7 };
  const mid = { x: 0.5, y: 0.65 };
  const dx = ankle.x - shoulder.x; const dy = ankle.y - shoulder.y;
  const len = Math.hypot(dx, dy);
  const offset = Math.tan((sag * Math.PI) / 360) * (len / 2);
  const hip = { x: mid.x - (dy / len) * -offset, y: mid.y + (dx / len) * offset };
  frame[11] = { ...shoulder, v: vis }; frame[23] = { ...hip, v: vis }; frame[27] = { ...ankle, v: vis };
  return frame;
}
