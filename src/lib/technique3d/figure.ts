import { add, rotY, scale, sub } from './math';
import type { PoseFrame, Vec3 } from './types';

/**
 * Stored poses are y-up, hip-centred, in metres, in the phone camera's view:
 * +x is to the right of the picture, +y is up, +z is toward the phone.
 * MediaPipe world landmarks are not already in that frame. Image landmarks
 * (x right, y down, smaller z closer) choose the rotation. A rotation keeps
 * anatomical left and right on their own indices.
 */

export const VIEW_FILL = 0.72;
export const VIEW_FOV = 40;

export type LayoutMode = 'player' | 'reference' | 'side' | 'overlay';
export type Bounds = { min: Vec3; max: Vec3 };
export type CameraFit = { target: Vec3; position: Vec3; distance: number };
export type Framing = { playerShift: number; referenceShift: number; bounds: Bounds; ground: number };
export type Projected = { vertical: number; horizontal: number; centerX: number; centerY: number };

type Side = 'left' | 'right' | 'center';
export type FigureBone = { a: number; b: number; side: Side };

export const FIGURE_BONES: FigureBone[] = [
  { a: 11, b: 12, side: 'center' },
  { a: 23, b: 24, side: 'center' },
  { a: 11, b: 23, side: 'center' },
  { a: 12, b: 24, side: 'center' },
  { a: 11, b: 13, side: 'left' },
  { a: 13, b: 15, side: 'left' },
  { a: 12, b: 14, side: 'right' },
  { a: 14, b: 16, side: 'right' },
  { a: 23, b: 25, side: 'left' },
  { a: 25, b: 27, side: 'left' },
  { a: 27, b: 31, side: 'left' },
  { a: 24, b: 26, side: 'right' },
  { a: 26, b: 28, side: 'right' },
  { a: 28, b: 32, side: 'right' },
];

export const SIDE_COLOR = { left: '#22d3ee', right: '#fb923c', center: '#f8fafc' } as const;
export const REFERENCE_COLOR = { left: '#fde68a', right: '#d97706', center: '#fbbf24' } as const;

const ALIGN = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const FEET = [27, 28, 31, 32];

/** parent, child, shortest plausible metres, longest plausible metres */
const LIMBS: Array<[number, number, number, number]> = [
  [23, 25, 0.32, 0.55],
  [25, 27, 0.30, 0.52],
  [27, 31, 0.08, 0.22],
  [24, 26, 0.32, 0.55],
  [26, 28, 0.30, 0.52],
  [28, 32, 0.08, 0.22],
  [11, 13, 0.22, 0.40],
  [13, 15, 0.18, 0.34],
  [12, 14, 0.22, 0.40],
  [14, 16, 0.18, 0.34],
];

const EMPTY_BOUNDS: Bounds = { min: [-0.45, -0.95, -0.35], max: [0.45, 0.85, 0.35] };

function cloneFrame(frame: PoseFrame): PoseFrame {
  return frame.map((point) => [point[0], point[1], point[2]] as Vec3);
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function unit(v: Vec3, fallback: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  if (n < 1e-4) return fallback;
  return [v[0] / n, v[1] / n, v[2] / n];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function hipOf(frame: PoseFrame): Vec3 {
  const left = frame[23] ?? [0, 0, 0];
  const right = frame[24] ?? [0, 0, 0];
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2, (left[2] + right[2]) / 2];
}

export function hipCenter(frame: PoseFrame): PoseFrame {
  const hip = hipOf(frame);
  return frame.map((point) => sub(point, hip));
}

function imageTarget(image: PoseFrame, index: number): Vec3 {
  const point = image[index] ?? [0.5, 0.5, 0];
  return [point[0] - 0.5, 0.5 - point[1], -(point[2] ?? 0)];
}

function similarityError(source: Vec3[], target: Vec3[]): number {
  const n = source.length;
  if (n === 0) return 1;
  const mean = (points: Vec3[]): Vec3 => points.reduce((acc, point) => add(acc, point), [0, 0, 0] as Vec3).map((value) => value / n) as Vec3;
  const sc = mean(source);
  const tc = mean(target);
  const s = source.map((point) => sub(point, sc));
  const t = target.map((point) => sub(point, tc));
  let ss = 0;
  let st = 0;
  for (let i = 0; i < n; i++) {
    ss += dot(s[i], s[i]);
    st += dot(s[i], t[i]);
  }
  if (ss < 1e-8) return 1;
  const fitted = st / ss;
  let err = 0;
  for (let i = 0; i < n; i++) {
    const guess = scale(s[i], fitted);
    err += dist(guess, t[i]) ** 2;
  }
  if (fitted < 0) err += n;
  return err / n;
}

function yawError(frame: PoseFrame, image: PoseFrame, degrees: number): number {
  const source = ALIGN.map((index) => rotY(frame[index] ?? [0, 0, 0], degrees));
  const target = ALIGN.map((index) => imageTarget(image, index));
  return similarityError(source, target);
}

function bestYaw(frame: PoseFrame, image: PoseFrame, hint: number | null): number {
  let best = hint ?? 0;
  let score = Infinity;
  for (let step = 0; step < 72; step++) {
    const yaw = step * 5;
    const jump = hint == null ? 0 : (Math.abs(((yaw - hint + 540) % 360) - 180) / 180) ** 2 * 0.002;
    const next = yawError(frame, image, yaw) + jump;
    if (next < score) {
      score = next;
      best = yaw;
    }
  }
  return best;
}

function noseAboveHips(frame: PoseFrame): boolean {
  if (!frame[0] || !frame[23] || !frame[24]) return true;
  return frame[0][1] >= (frame[23][1] + frame[24][1]) / 2;
}

function imageNoseAbove(image: PoseFrame): boolean {
  if (!image[0] || !image[23] || !image[24]) return true;
  return image[0][1] <= (image[23][1] + image[24][1]) / 2;
}

/** The frame where the picture shows the most upright head, so a bent delivery does not choose the axis. */
function uprightIndex(images: PoseFrame[]): number {
  let best = 0;
  let gap = -1;
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    if (!image?.[0] || !image[23] || !image[24]) continue;
    const next = Math.abs(image[0][1] - (image[23][1] + image[24][1]) / 2);
    if (next > gap) {
      gap = next;
      best = i;
    }
  }
  return best;
}

function turn180X(frame: PoseFrame): PoseFrame {
  return frame.map(([x, y, z]) => [x, -y, -z] as Vec3);
}

/**
 * Put world landmarks into the phone's view and restore limb lengths.
 * `imageFrames` use MediaPipe image landmarks. Without them, only the y-up vote and the limb lengths run.
 */
export function prepareClip(worldFrames: PoseFrame[], imageFrames?: Array<PoseFrame | null> | null): PoseFrame[] {
  if (worldFrames.length === 0) return [];
  let frames = worldFrames.map((frame) => hipCenter(cloneFrame(frame)));
  const images = imageFrames && imageFrames.length === frames.length ? imageFrames : null;
  const known = images?.filter((frame): frame is PoseFrame => !!frame) ?? [];
  if (images && known.length > 0) {
    const sample = uprightIndex(known);
    const image = known[sample];
    const worldIndex = images.findIndex((frame) => frame === image);
    const world = frames[worldIndex] ?? frames[0];
    if (image && world && imageNoseAbove(image) !== noseAboveHips(world)) frames = frames.map(turn180X);
    let hint: number | null = null;
    frames = frames.map((frame, index) => {
      const shot = images[index];
      if (!shot) return frame.map((point) => rotY(point, hint ?? 0));
      const yaw = bestYaw(frame, shot, hint);
      hint = yaw;
      return frame.map((point) => rotY(point, yaw));
    });
  } else if (frames.filter(noseAboveHips).length < frames.length / 2) {
    frames = frames.map(turn180X);
  }
  frames = frames.map(hipCenter);
  return normalizeLimbs(frames).map(hipCenter);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

const TORSO_LOW = 0.38;
const TORSO_HIGH = 0.62;
const ARM_CHAIN = [0, 11, 12, 13, 14, 15, 16];

function mid(frame: PoseFrame, a: number, b: number): Vec3 {
  const left = frame[a] ?? [0, 0, 0];
  const right = frame[b] ?? [0, 0, 0];
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2, (left[2] + right[2]) / 2];
}

function normalizeLimbs(frames: PoseFrame[]): PoseFrame[] {
  const lengths = new Map<string, number>();
  for (const [parent, child, low, high] of LIMBS) {
    const seen = frames.map((frame) => dist(frame[parent], frame[child])).filter((value) => value > 0.05);
    const raw = median(seen);
    lengths.set(`${parent}-${child}`, Math.min(high, Math.max(low, raw || (low + high) / 2)));
  }
  const torsoSeen = frames.map((frame) => dist(mid(frame, 23, 24), mid(frame, 11, 12))).filter((value) => value > 0.15);
  const torso = Math.min(TORSO_HIGH, Math.max(TORSO_LOW, median(torsoSeen) || 0.5));
  const previous = new Map<string, Vec3>();
  return frames.map((frame) => {
    const next = cloneFrame(frame);
    const hips = mid(next, 23, 24);
    const shoulders = mid(next, 11, 12);
    const torsoDir = unit(sub(shoulders, hips), previous.get('torso') ?? [0, 1, 0]);
    previous.set('torso', torsoDir);
    const shoulderShift = sub(add(hips, scale(torsoDir, torso)), shoulders);
    if (Math.hypot(...shoulderShift) > 1e-4) {
      for (const index of ARM_CHAIN) if (next[index]) next[index] = add(next[index], shoulderShift);
    }
    for (const [parent, child] of LIMBS) {
      const key = `${parent}-${child}`;
      const target = lengths.get(key) ?? 0.3;
      const delta = sub(next[child], next[parent]);
      const direction = unit(delta, previous.get(key) ?? [0, parent >= 23 ? -1 : 1, 0]);
      previous.set(key, direction);
      next[child] = add(next[parent], scale(direction, target));
    }
    return next;
  });
}

export function limbLength(frame: PoseFrame, parent: number, child: number): number {
  if (!frame[parent] || !frame[child]) return 0;
  return dist(frame[parent], frame[child]);
}

export function boundsOf(frames: PoseFrame[]): Bounds {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  let seen = false;
  for (const frame of frames) {
    for (const point of frame) {
      if (!point || point.some((value) => !Number.isFinite(value))) continue;
      seen = true;
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], point[axis]);
        max[axis] = Math.max(max[axis], point[axis]);
      }
    }
  }
  return seen ? { min, max } : EMPTY_BOUNDS;
}

function shiftFrame(frame: PoseFrame, dx: number): PoseFrame {
  if (dx === 0) return frame;
  return frame.map(([x, y, z]) => [x + dx, y, z] as Vec3);
}

function widthOf(bounds: Bounds): number {
  return Math.max(0.2, bounds.max[0] - bounds.min[0]);
}

function centerX(bounds: Bounds): number {
  return (bounds.min[0] + bounds.max[0]) / 2;
}

export function clipFraming(playerClip: PoseFrame[] | null, referenceClip: PoseFrame[] | null, layout: LayoutMode): Framing {
  const showPlayer = layout !== 'reference' && !!playerClip?.length;
  const showReference = layout !== 'player' && !!referenceClip?.length;
  let playerShift = 0;
  let referenceShift = 0;
  if (layout === 'side' && showPlayer && showReference && playerClip && referenceClip) {
    const playerBounds = boundsOf(playerClip);
    const referenceBounds = boundsOf(referenceClip);
    const playerWidth = widthOf(playerBounds);
    const referenceWidth = widthOf(referenceBounds);
    const gap = 0.28;
    const total = playerWidth + referenceWidth + gap;
    const left = -total / 2;
    playerShift = left + playerWidth / 2 - centerX(playerBounds);
    referenceShift = left + playerWidth + gap + referenceWidth / 2 - centerX(referenceBounds);
  }
  const placed: PoseFrame[] = [];
  if (showPlayer && playerClip) placed.push(...playerClip.map((frame) => shiftFrame(frame, playerShift)));
  if (showReference && referenceClip) placed.push(...referenceClip.map((frame) => shiftFrame(frame, referenceShift)));
  const bounds = boundsOf(placed);
  let ground = bounds.min[1];
  const feet = placed.flatMap((frame) => FEET.map((index) => frame[index]?.[1]).filter((value): value is number => Number.isFinite(value)));
  if (feet.length) ground = Math.min(...feet);
  return { playerShift, referenceShift, bounds, ground };
}

export function placeFrame(frame: PoseFrame | null, shiftX: number): PoseFrame | null {
  if (!frame) return null;
  return shiftFrame(frame, shiftX);
}

function normalize(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** NDC share of the bounding box. 1 means it touches the top and bottom of the view. */
export function projectedShare(bounds: Bounds, aspect: number, fovDeg = VIEW_FOV, position?: Vec3, target?: Vec3): Projected {
  const fit = position && target ? { position, target, distance: dist(position, target) } : frameCamera(bounds, aspect, fovDeg);
  const forward = normalize(sub(fit.target, fit.position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const tan = Math.tan((fovDeg * Math.PI) / 360);
  const safeAspect = Math.max(0.2, aspect);
  const project = (point: Vec3) => {
    const fromEye = sub(point, fit.position);
    const camZ = Math.max(1e-4, dot(fromEye, forward));
    return {
      x: dot(fromEye, right) / (camZ * tan * safeAspect),
      y: dot(fromEye, up) / (camZ * tan),
    };
  };
  const corners: Vec3[] = [];
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) corners.push([x, y, z]);
    }
  }
  const flat = corners.map(project);
  const center = project([
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ]);
  const xs = flat.map((point) => point.x);
  const ys = flat.map((point) => point.y);
  return {
    horizontal: (Math.max(...xs) - Math.min(...xs)) / 2,
    vertical: (Math.max(...ys) - Math.min(...ys)) / 2,
    centerX: center.x,
    centerY: center.y,
  };
}

/** Distance is chosen so the longer screen axis of the box fills VIEW_FILL of the view. */
export function frameCamera(bounds: Bounds, aspect: number, fovDeg = VIEW_FOV): CameraFit {
  const target: Vec3 = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const direction = normalize([0, 0.08, 1]);
  let lo = 0.15;
  let hi = 40;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const share = projectedShare(bounds, aspect, fovDeg, add(target, scale(direction, mid)), target);
    if (Math.max(share.vertical, share.horizontal) > VIEW_FILL) lo = mid;
    else hi = mid;
  }
  return { target, position: add(target, scale(direction, hi)), distance: hi };
}
