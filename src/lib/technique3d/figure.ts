import { add, scale, sub } from './math';
import type { PoseFrame, Vec3 } from './types';

/**
 * Stored poses are y-up, hip-centred, in metres, in the phone camera's view:
 * +x is to the right of the picture, +y is up, +z is toward the phone.
 * MediaPipe world landmarks are not already in that frame. Image landmarks
 * (x right, y down, smaller z closer) choose the rotation. A rotation keeps
 * anatomical left and right on their own indices.
 */

/** The on-screen box of the drawn figure should cover this much of the tighter panel edge. */
export const VIEW_FILL = 0.85;
/** About 8% left clear on each side when the box is centred at that fill. */
export const VIEW_PAD = (1 - VIEW_FILL) / 2;
/** Landscape panels stay at least this far from every edge, as a fraction of that edge. */
export const VIEW_MARGIN = 0.06;
/** Closest the camera may come on a landscape panel. */
export const VIEW_SAFE_FILL = 1 - 2 * VIEW_MARGIN;
/**
 * On a portrait panel the margin is this fraction of the shorter side, on every edge.
 * A wide pose is then about 90% of the width.
 */
export const PORTRAIT_MARGIN = 0.04;
export const PORTRAIT_WIDTH_FILL = 0.9;

/** How much of each screen axis the drawn box may cover. Landscape keeps one fill on both. */
export function frameAllowance(aspect: number, fill = VIEW_FILL): { x: number; y: number } {
  const safe = Math.max(0.2, aspect);
  if (safe >= 1) return { x: fill, y: fill };
  return { x: PORTRAIT_WIDTH_FILL, y: 1 - 2 * PORTRAIT_MARGIN * safe };
}
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
  const raw = boundsOf(placed);
  const cx = centerX(raw);
  playerShift -= cx;
  referenceShift -= cx;
  const bounds: Bounds = {
    min: [raw.min[0] - cx, raw.min[1], raw.min[2]],
    max: [raw.max[0] - cx, raw.max[1], raw.max[2]],
  };
  return { playerShift, referenceShift, playerDrop, referenceDrop, bounds, ground: 0 };
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

function boxCorners(bounds: Bounds): Vec3[] {
  const corners: Vec3[] = [];
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) corners.push([x, y, z]);
    }
  }
  return corners;
}

const CENTER_JOINTS = new Set([11, 12, 23, 24]);
const LIMB_JOINTS = new Set([13, 14, 15, 16, 25, 26, 27, 28, 31, 32]);

/** Radius of the drawn marker, in metres. The head is the large sphere. */
export function drawnRadius(index: number): number {
  if (index === 0) return 0.1;
  if (CENTER_JOINTS.has(index)) return 0.05;
  if (LIMB_JOINTS.has(index)) return 0.04;
  return 0.02;
}

type Mark = { point: Vec3; radius: number };

function marksOf(frames: PoseFrame[], includeRadii = true): Mark[] {
  const marks: Mark[] = [];
  for (const frame of frames) {
    frame.forEach((point, index) => {
      if (point?.every((value) => Number.isFinite(value))) marks.push({ point, radius: includeRadii ? drawnRadius(index) : 0 });
    });
  }
  return marks;
}

function meanPoint(points: Vec3[]): Vec3 {
  const sum = points.reduce((acc, point) => add(acc, point), [0, 0, 0] as Vec3);
  return scale(sum, 1 / points.length);
}

/** Poses within half a second of the playhead, so the framing does not jump every frame. */
export function framesAround(frames: PoseFrame[], times: number[] | null, time: number, span = 0.5): PoseFrame[] {
  if (frames.length === 0) return [];
  if (!times || times.length !== frames.length) return [frames[0]];
  const half = span / 2;
  const picked = frames.filter((_, index) => Math.abs((times[index] ?? 0) - time) <= half);
  if (picked.length > 0) return picked;
  let best = 0;
  let dist = Infinity;
  for (let index = 0; index < times.length; index++) {
    const next = Math.abs(times[index] - time);
    if (next < dist) { dist = next; best = index; }
  }
  return [frames[best]];
}

function screenBox(marks: Mark[], fit: CameraFit, aspect: number, fovDeg: number): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const position = fit.position;
  const forward = normalize(sub(fit.target, position));
  const tan = Math.tan((fovDeg * Math.PI) / 360);
  const safeAspect = Math.max(0.2, aspect);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let seen = 0;
  for (const mark of marks) {
    const camZ = dot(sub(mark.point, position), forward);
    if (camZ < 1e-3) continue;
    const point = projectAt(mark.point, fit, safeAspect, fovDeg);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
    const padY = mark.radius / (camZ * tan);
    const padX = padY / safeAspect;
    seen += 1;
    minX = Math.min(minX, point.x - padX);
    maxX = Math.max(maxX, point.x + padX);
    minY = Math.min(minY, point.y - padY);
    maxY = Math.max(maxY, point.y + padY);
  }
  return seen === 0 ? null : { minX, maxX, minY, maxY };
}

/**
 * Move part of the way toward the fitted distance, but never closer than the
 * distance that keeps the pose inside the margin. Zooming out can ease; clipping cannot.
 */
export function easeFitDistance(previous: number | null, needed: number, safe: number): number {
  const goal = Math.max(needed, safe);
  if (previous == null || !Number.isFinite(previous)) return goal;
  const eased = previous + (goal - previous) * 0.35;
  return Math.max(eased, safe);
}

/**
 * Frames the drawn figure as it appears on screen, including joint and head radii.
 * The look-at point is the centre of that flat box, not the hips and not the 3D middle.
 * `direction` is from the look-at point toward the camera, so a dragged view keeps its angle.
 */
export function screenFit(frames: PoseFrame[], aspect: number, fovDeg = VIEW_FOV, direction?: Vec3, fill = VIEW_FILL, includeRadii = true): CameraFit {
  const marks = marksOf(frames, includeRadii);
  const safeAspect = Math.max(0.2, aspect);
  const tan = Math.tan((fovDeg * Math.PI) / 360);
  if (marks.length === 0) {
    return { target: [0, 0.8, 0], position: [0, 0.9, 3], distance: 3 };
  }
  let target = meanPoint(marks.map((mark) => mark.point));
  let reach = 0.4;
  for (const mark of marks) {
    const point = mark.point;
    reach = Math.max(reach, Math.hypot(point[0] - target[0], point[1] - target[1], point[2] - target[2]) + mark.radius);
  }
  const limits = frameAllowance(safeAspect, fill);
  let distance = reach / tan / Math.min(limits.x, limits.y);
  const dir = normalize(direction ?? [0, reach * 0.04, 1]);
  for (let step = 0; step < 10; step++) {
    const position = add(target, scale(dir, distance));
    const fit: CameraFit = { target, position, distance };
    const box = screenBox(marks, fit, safeAspect, fovDeg);
    if (!box) break;
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    const forward = normalize(sub(target, position));
    const right = normalize(cross(forward, [0, 1, 0]));
    const up = cross(right, forward);
    target = add(target, add(scale(right, cx * distance * tan * safeAspect), scale(up, cy * distance * tan)));
    const usedX = (box.maxX - box.minX) / 2 / limits.x;
    const usedY = (box.maxY - box.minY) / 2 / limits.y;
    const limiting = Math.max(usedX, usedY);
    if (limiting > 1e-3) distance *= limiting;
    distance = Math.min(80, Math.max(0.25, distance));
  }
  return { target, position: add(target, scale(dir, distance)), distance };
}

/**
 * Look-at point that puts this frame's drawn box in the middle at a fixed camera distance.
 * Scale can ease toward a new distance; the centre is solved for the distance in use.
 */
export function centerAtDistance(frames: PoseFrame[], aspect: number, fovDeg: number, direction: Vec3, distance: number, includeRadii = true): Vec3 {
  const marks = marksOf(frames, includeRadii);
  const safeAspect = Math.max(0.2, aspect);
  const tan = Math.tan((fovDeg * Math.PI) / 360);
  if (marks.length === 0) return [0, 0.8, 0];
  let target = meanPoint(marks.map((mark) => mark.point));
  const dir = normalize(direction);
  for (let step = 0; step < 10; step++) {
    const position = add(target, scale(dir, distance));
    const box = screenBox(marks, { target, position, distance }, safeAspect, fovDeg);
    if (!box) break;
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    if (Math.abs(cx) < 1e-4 && Math.abs(cy) < 1e-4) break;
    const forward = normalize(sub(target, position));
    const right = normalize(cross(forward, [0, 1, 0]));
    const up = cross(right, forward);
    target = add(target, add(scale(right, cx * distance * tan * safeAspect), scale(up, cy * distance * tan)));
  }
  return target;
}

/** Where the drawn box sits when the camera is held at `distance` and recentred. */
export function readingAtDistance(frames: PoseFrame[], aspect: number, direction: Vec3, distance: number, fovDeg = VIEW_FOV): { centerX: number; centerY: number; horizontal: number; vertical: number } {
  const target = centerAtDistance(frames, aspect, fovDeg, direction, distance);
  const dir = normalize(direction);
  const position = add(target, scale(dir, distance));
  const box = screenBox(marksOf(frames), { target, position, distance }, aspect, fovDeg);
  const minX = box?.minX ?? 0;
  const maxX = box?.maxX ?? 0;
  const minY = box?.minY ?? 0;
  const maxY = box?.maxY ?? 0;
  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    horizontal: (maxX - minX) / 2,
    vertical: (maxY - minY) / 2,
  };
}

export type ScreenReading = Projected & {
  limiting: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  points: Array<{ x: number; y: number }>;
};

/** The flat box of the drawn markers, including their radii, after the screen-space fit. */
export function poseOnScreen(frames: PoseFrame[], aspect: number, fovDeg = VIEW_FOV, includeRadii = true): ScreenReading {
  const fit = screenFit(frames, aspect, fovDeg, undefined, VIEW_FILL, includeRadii);
  const marks = marksOf(frames, includeRadii);
  const box = screenBox(marks, fit, aspect, fovDeg);
  const points = marks.map((mark) => projectAt(mark.point, fit, aspect, fovDeg)).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  const minX = box?.minX ?? 0;
  const maxX = box?.maxX ?? 0;
  const minY = box?.minY ?? 0;
  const maxY = box?.maxY ?? 0;
  const vertical = (maxY - minY) / 2;
  const horizontal = (maxX - minX) / 2;
  return {
    vertical,
    horizontal,
    limiting: Math.max(vertical, horizontal),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    minX,
    maxX,
    minY,
    maxY,
    points,
  };
}

/** Every corner of the box, in view space. The centre is the middle of that flat box. */
export function projectedShare(bounds: Bounds, aspect: number, fovDeg = VIEW_FOV): Projected {
  const reading = poseOnScreen([boxCorners(bounds)], aspect, fovDeg, false);
  return { vertical: reading.vertical, horizontal: reading.horizontal, centerX: reading.centerX, centerY: reading.centerY };
}

/** Where each joint lands. Used to prove a lean or a reach stays inside the panel. */
export function projectJoints(frames: PoseFrame[], aspect: number, fovDeg = VIEW_FOV): Array<{ x: number; y: number }> {
  return poseOnScreen(frames, aspect, fovDeg).points;
}
