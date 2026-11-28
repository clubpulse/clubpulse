import type { Vec3 } from '@/lib/technique3d/types';

/**
 * A made-up right-arm bowler as a function of time, so the same action can be "filmed" at 30 or 120 frames a second.
 * Nothing here comes from a real clip. Limbs are rigid (two-bone IK), y is up, the body is hip-centred.
 *
 * Truth the tests check against:
 *  - back foot lowest at BACK_FOOT_T (down onto the ground and back up)
 *  - front foot comes down at a steady speed and stops dead at FRONT_FOOT_T
 *  - the bowling wrist is fastest at about RELEASE_T (checked numerically by `truthRelease`)
 */
export const BACK_FOOT_T = 0.5;
export const FRONT_FOOT_T = 0.8;
export const RELEASE_T = 0.95;
export const DURATION = 1.6;

const T1 = 0.42; // thigh
const T2 = 0.42; // shin
const A1 = 0.3; // upper arm
const A2 = 0.27; // forearm

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vec3): Vec3 => mul(a, 1 / (len(a) || 1));
const smooth = (t: number, a: number, b: number) => {
  const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

/** Middle joint of a two-bone limb, bending toward `bend`. */
function ik(root: Vec3, target: Vec3, l1: number, l2: number, bend: Vec3): { mid: Vec3; end: Vec3 } {
  let d = sub(target, root);
  const max = (l1 + l2) * 0.999;
  if (len(d) > max) d = mul(unit(d), max);
  const dist = len(d);
  const dir = unit(d);
  const a = (dist * dist + l1 * l1 - l2 * l2) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const side = unit(sub(bend, mul(dir, bend[0] * dir[0] + bend[1] * dir[1] + bend[2] * dir[2])));
  return { mid: add(add(root, mul(dir, a)), mul(side, h)), end: add(root, d) };
}

function rotateY(p: Vec3, deg: number): Vec3 {
  const a = (deg * Math.PI) / 180;
  return [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
}

export function backAnkleY(t: number): number {
  // Comes down onto the ground and goes back up: a V, lowest at BACK_FOOT_T
  return -0.8 + Math.min(1.5 * Math.abs(t - BACK_FOOT_T), 0.3);
}
export function frontAnkleY(t: number): number {
  if (t <= 0.6) return -0.4;
  if (t >= FRONT_FOOT_T) return -0.8;
  return -0.4 - 2.0 * (t - 0.6);
}

/** 33 world landmarks at time t. */
export function bowlerAt(t: number): Vec3[] {
  const p = Array.from({ length: 33 }, () => [0, 0, 0] as Vec3);
  const twist = 40 * smooth(t, 0.55, 1.1); // shoulders turn against fixed hips
  const hipL: Vec3 = [-0.1, 0, 0];
  const hipR: Vec3 = [0.1, 0, 0];
  p[23] = hipL; p[24] = hipR;
  p[11] = rotateY([-0.2, 0.5, 0], twist);
  p[12] = rotateY([0.2, 0.5, 0], twist);
  p[0] = [0, 0.72, 0.05];
  p[1] = [-0.03, 0.75, 0.07]; p[2] = [-0.06, 0.75, 0.06]; p[3] = [-0.09, 0.75, 0.04];
  p[4] = [0.03, 0.75, 0.07]; p[5] = [0.06, 0.75, 0.06]; p[6] = [0.09, 0.75, 0.04];
  p[7] = [-0.11, 0.72, 0]; p[8] = [0.11, 0.72, 0]; p[9] = [-0.03, 0.68, 0.06]; p[10] = [0.03, 0.68, 0.06];

  // Legs
  const frontLeg = ik(hipL, [-0.1, frontAnkleY(t), 0.02], T1, T2, [0, 0, 1]);
  p[25] = frontLeg.mid; p[27] = frontLeg.end;
  const backLeg = ik(hipR, [0.1, backAnkleY(t), -0.02], T1, T2, [0, 0, 1]);
  p[26] = backLeg.mid; p[28] = backLeg.end;
  for (const [ankle, heel, toe] of [[27, 29, 31], [28, 30, 32]] as const) {
    p[heel] = add(p[ankle], [0, -0.04, -0.03]);
    p[toe] = add(p[ankle], [0, -0.05, 0.12]);
  }

  // Bowling arm sweeps a half circle about the shoulder, fastest in the middle (t = 0.95)
  const u = Math.min(1, Math.max(0, (t - 0.6) / 0.7));
  const theta = Math.PI * (u - Math.sin(2 * Math.PI * u) / (2 * Math.PI));
  const reach = 0.5;
  const wristTarget = add(p[12], mul([0.1, -Math.cos(theta), -Math.sin(theta)], reach));
  const right = ik(p[12], wristTarget, A1, A2, [1, 0, 0]);
  p[14] = right.mid; p[16] = right.end;
  // Front arm: reach and direction change slowly, so the elbow angle changes during the action
  const s = smooth(t, 0.5, 1.2);
  const lReach = 0.42 + 0.1 * s;
  const lTarget = add(p[11], mul(unit([-0.5, 0.2 + 0.8 * s, 0.5 * (1 - s)]), lReach));
  const left = ik(p[11], lTarget, A1, A2, [0, 0, 1]);
  p[13] = left.mid; p[15] = left.end;
  for (const [wrist, a, b, c] of [[15, 17, 19, 21], [16, 18, 20, 22]] as const) {
    p[a] = add(p[wrist], [0.02, 0.02, 0]); p[b] = add(p[wrist], [0, 0.04, 0.01]); p[c] = add(p[wrist], [-0.02, 0.01, 0]);
  }
  return p;
}

/** Elbow, knee and shoulder-hip angles are read from this by the app's own `anglesAt`. */
export function visibilityAt(t: number): number[] {
  const v = new Array<number>(33).fill(0.92);
  // The model is least sure of the bowling arm for a tenth of a second around release
  if (Math.abs(t - RELEASE_T) < 0.1) for (const j of [14, 16, 18, 20, 22]) v[j] = 0.32;
  return v;
}

/** Seeded noise so a failure repeats. */
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

export type SynthOptions = {
  fps: number;
  seed?: number;
  noise?: number;
  /** Frame numbers the model returns no body for. */
  dropFrames?: Iterable<number>;
  /** Frames where one joint is under the model's own floor, so the frame is dropped. */
  dropAt?: (t: number) => boolean;
};

/** What the model would hand back for each native frame of a clip at this frame rate. */
export function synthClip(options: SynthOptions) {
  const { fps, seed = 7, noise = 0.003 } = options;
  const rand = rng(seed + fps);
  const drop = new Set(options.dropFrames ?? []);
  const count = Math.round(DURATION * fps);
  const frames = [];
  for (let index = 0; index < count; index++) {
    const t = (index + 0.5) / fps;
    const missing = drop.has(index) || (options.dropAt?.(t) ?? false);
    const world = missing ? null : bowlerAt(t).map((q) => q.map((c) => c + (rand() - 0.5) * 2 * noise) as Vec3);
    frames.push({ index, t, world, image: null as Vec3[] | null, vis: missing ? null : visibilityAt(t) });
  }
  return frames;
}

/** True wrist-speed peak of the bowling arm in hip-centred space, found at 2000 Hz with no noise. */
export function truthRelease(): number {
  let best = 0;
  let at = 0;
  const dt = 0.0005;
  for (let t = FRONT_FOOT_T; t < DURATION - 0.1; t += dt) {
    const a = bowlerAt(t - dt)[16];
    const b = bowlerAt(t + dt)[16];
    const speed = len(sub(b, a)) / (2 * dt);
    if (speed > best) { best = speed; at = t; }
  }
  return at;
}
