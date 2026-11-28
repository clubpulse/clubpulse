import { add, scale, sub } from './math';
import type { PoseFrame, Vec3 } from './types';

/**
 * Stored poses are y-up, hip-centred, in metres, in the phone camera's view:
 * +x is to the right of the picture, +y is up, +z is toward the phone.
 * MediaPipe world landmarks are not already in that frame. Image landmarks
 * (x right, y down, smaller z closer) choose the rotation. A rotation keeps
 * anatomical left and right on their own indices.
 */

/** Share of the panel height the body should fill. Portrait panels back off if the width would clip. */
export const VIEW_FILL = 0.85;
const VIEW_WIDTH_LIMIT = 0.92;
export const VIEW_FOV = 40;

export type LayoutMode = 'player' | 'reference' | 'side' | 'overlay';
export type Bounds = { min: Vec3; max: Vec3 };
export type CameraFit = { target: Vec3; position: Vec3; distance: number };
export type Framing = {
  playerShift: number;
  referenceShift: number;
  playerDrop: number;
  referenceDrop: number;
  bounds: Bounds;
  ground: number;
};
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
 * Put world landmarks into the phone's view.
 * The picture's x and y are kept, so a forward lean stays a lean and left/right match the video
 * for a left-hander or a front-on camera. World depth is only the toward-camera axis.
 * Limb lengths are repaired only when a joint collapses or stretches. A normal pose is not pulled upright.
 */
export function prepareClip(worldFrames: PoseFrame[], imageFrames?: Array<PoseFrame | null> | null): PoseFrame[] {
  if (worldFrames.length === 0) return [];
  let frames = worldFrames.map((frame) => hipCenter(cloneFrame(frame)));
  const images = imageFrames && imageFrames.length === frames.length ? imageFrames : null;
  const known = images?.filter((frame): frame is PoseFrame => !!frame) ?? [];
  if (images && known.length > 0) {
    const image = known[uprightIndex(known)];
    const worldIndex = images.findIndex((frame) => frame === image);
    const world = frames[worldIndex] ?? frames[0];
    if (image && world && imageNoseAbove(image) !== noseAboveHips(world)) frames = frames.map(turn180X);
    const sample = frames[worldIndex] ?? frames[0];
    const zSign = image && sample ? depthSign(sample, image) : 1;
    frames = frames.map((frame, index) => {
      const shot = images[index];
      return shot ? liftFrame(frame, shot, zSign) : frame;
    });
  } else if (frames.filter(noseAboveHips).length < frames.length / 2) {
    frames = frames.map(turn180X);
  }
  return repairOutliers(frames).map(plantFeet);
}

function depthSign(world: PoseFrame, image: PoseFrame): number {
  const hip = hipOf(world);
  let corr = 0;
  for (const index of ALIGN) {
    const point = world[index];
    const shot = image[index];
    if (!point || !shot) continue;
    corr += (point[2] - hip[2]) * -(shot[2] ?? 0);
  }
  return corr >= 0 ? 1 : -1;
}

function liftFrame(world: PoseFrame, image: PoseFrame, zSign: number): PoseFrame {
  const hip = hipOf(world);
  const ankleY = Math.min(world[27]?.[1] ?? 0, world[28]?.[1] ?? 0);
  const worldHeight = Math.max(0.4, (world[0]?.[1] ?? 0) - ankleY);
  const imageNose = 0.5 - (image[0]?.[1] ?? 0.5);
  const imageFoot = Math.min(0.5 - (image[27]?.[1] ?? 1), 0.5 - (image[28]?.[1] ?? 1));
  const imageHeight = Math.max(0.05, imageNose - imageFoot);
  const metres = worldHeight / imageHeight;
  return image.map((point, index) => {
    const from = world[index] ?? hip;
    return [(point[0] - 0.5) * metres, (0.5 - point[1]) * metres, (from[2] - hip[2]) * zSign] as Vec3;
  });
}

export function plantFeet(frame: PoseFrame): PoseFrame {
  const low = lowestFootY(frame);
  if (!Number.isFinite(low)) return frame;
  return frame.map(([x, y, z]) => [x, y - low, z] as Vec3);
}

export function lowestFootY(frame: PoseFrame): number {
  const ys = FEET.map((index) => frame[index]?.[1]).filter((value): value is number => Number.isFinite(value));
  return ys.length ? Math.min(...ys) : 0;
}

/** Degrees the trunk leans away from upright. 0 is vertical. */
export function trunkLeanDegrees(frame: PoseFrame): number {
  const hips = mid(frame, 23, 24);
  const shoulders = mid(frame, 11, 12);
  const dx = shoulders[0] - hips[0];
  const dy = shoulders[1] - hips[1];
  const dz = shoulders[2] - hips[2];
  return (Math.atan2(Math.hypot(dx, dz), Math.max(1e-6, dy)) * 180) / Math.PI;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function mid(frame: PoseFrame, a: number, b: number): Vec3 {
  const left = frame[a] ?? [0, 0, 0];
  const right = frame[b] ?? [0, 0, 0];
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2, (left[2] + right[2]) / 2];
}

/** Restores a bone only when that frame's length has collapsed or stretched. A leaned trunk is left as it is. */
function repairOutliers(frames: PoseFrame[]): PoseFrame[] {
  const lengths = new Map<string, number>();
  for (const [parent, child, low, high] of LIMBS) {
    const seen = frames.map((frame) => dist(frame[parent], frame[child])).filter((value) => value > 0.05);
    const raw = median(seen);
    lengths.set(`${parent}-${child}`, Math.min(high, Math.max(low, raw || (low + high) / 2)));
  }
  const previous = new Map<string, Vec3>();
  return frames.map((frame) => {
    const next = cloneFrame(frame);
    for (const [parent, child] of LIMBS) {
      const key = `${parent}-${child}`;
      const target = lengths.get(key) ?? 0.3;
      const delta = sub(next[child], next[parent]);
      const length = Math.hypot(delta[0], delta[1], delta[2]);
      const direction = unit(delta, previous.get(key) ?? [0, parent >= 23 ? -1 : 1, 0]);
      previous.set(key, direction);
      if (length >= target * 0.55 && length <= target * 1.7) continue;
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

function shiftFrame(frame: PoseFrame, dx: number, drop: number): PoseFrame {
  if (dx === 0 && drop === 0) return frame;
  return frame.map(([x, y, z]) => [x + dx, y - drop, z] as Vec3);
}

function footDrop(frames: PoseFrame[]): number {
  const ys = frames.flatMap((frame) => FEET.map((index) => frame[index]?.[1])).filter((value): value is number => Number.isFinite(value));
  return ys.length ? Math.min(...ys) : 0;
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
  const playerDrop = showPlayer && playerClip ? footDrop(playerClip) : 0;
  const referenceDrop = showReference && referenceClip ? footDrop(referenceClip) : 0;
  let playerShift = 0;
  let referenceShift = 0;
  if (layout === 'side' && showPlayer && showReference && playerClip && referenceClip) {
    const playerBounds = boundsOf(playerClip.map((frame) => shiftFrame(frame, 0, playerDrop)));
    const referenceBounds = boundsOf(referenceClip.map((frame) => shiftFrame(frame, 0, referenceDrop)));
    const playerWidth = widthOf(playerBounds);
    const referenceWidth = widthOf(referenceBounds);
    const gap = 0.28;
    const total = playerWidth + referenceWidth + gap;
    const left = -total / 2;
    playerShift = left + playerWidth / 2 - centerX(playerBounds);
    referenceShift = left + playerWidth + gap + referenceWidth / 2 - centerX(referenceBounds);
  }
  const placed: PoseFrame[] = [];
  if (showPlayer && playerClip) placed.push(...playerClip.map((frame) => shiftFrame(frame, playerShift, playerDrop)));
  if (showReference && referenceClip) placed.push(...referenceClip.map((frame) => shiftFrame(frame, referenceShift, referenceDrop)));
  return { playerShift, referenceShift, playerDrop, referenceDrop, bounds: boundsOf(placed), ground: 0 };
}

export function placeFrame(frame: PoseFrame | null, shiftX: number, drop = 0): PoseFrame | null {
  if (!frame) return null;
  return shiftFrame(frame, shiftX, drop);
}

function normalize(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function projectAt(point: Vec3, fit: CameraFit, aspect: number, fovDeg: number): { x: number; y: number } {
  const forward = normalize(sub(fit.target, fit.position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const tan = Math.tan((fovDeg * Math.PI) / 360);
  const fromEye = sub(point, fit.position);
  const camZ = Math.max(1e-4, dot(fromEye, forward));
  return {
    x: dot(fromEye, right) / (camZ * tan * Math.max(0.2, aspect)),
    y: dot(fromEye, up) / (camZ * tan),
  };
}

/** Height and width of the body at the camera's focus depth. Depth does not shrink the figure. */
export function projectedShare(bounds: Bounds, aspect: number, fovDeg = VIEW_FOV): Projected {
  const fit = frameCamera(bounds, aspect, fovDeg);
  const z = (bounds.min[2] + bounds.max[2]) / 2;
  const top = projectAt([(bounds.min[0] + bounds.max[0]) / 2, bounds.max[1], z], fit, aspect, fovDeg);
  const bottom = projectAt([(bounds.min[0] + bounds.max[0]) / 2, bounds.min[1], z], fit, aspect, fovDeg);
  const left = projectAt([bounds.min[0], (bounds.min[1] + bounds.max[1]) / 2, z], fit, aspect, fovDeg);
  const right = projectAt([bounds.max[0], (bounds.min[1] + bounds.max[1]) / 2, z], fit, aspect, fovDeg);
  const center = projectAt([(bounds.min[0] + bounds.max[0]) / 2, (bounds.min[1] + bounds.max[1]) / 2, z], fit, aspect, fovDeg);
  return {
    vertical: Math.abs(top.y - bottom.y) / 2,
    horizontal: Math.abs(right.x - left.x) / 2,
    centerX: center.x,
    centerY: center.y,
  };
}

/** Distance is chosen so the body height fills VIEW_FILL, unless a portrait panel would clip the width. */
export function frameCamera(bounds: Bounds, aspect: number, fovDeg = VIEW_FOV): CameraFit {
  const target: Vec3 = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2,
  ];
  const height = Math.max(0.2, bounds.max[1] - bounds.min[1]);
  const width = Math.max(0.2, bounds.max[0] - bounds.min[0]);
  const vFov = (fovDeg * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(0.2, aspect));
  const forHeight = (height / 2) / Math.tan(vFov / 2) / VIEW_FILL;
  const forWidth = (width / 2) / Math.tan(hFov / 2) / VIEW_WIDTH_LIMIT;
  const distance = Math.max(forHeight, forWidth, 0.4);
  const direction = normalize([0, height * 0.015, 1]);
  return { target, position: add(target, scale(direction, distance)), distance };
}
