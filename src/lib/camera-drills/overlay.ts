import { VISIBILITY_MIN } from './one-euro';
import type { PosePoint } from './pose';

export type Box = { width: number; height: number };

export type OverlayView = {
  /** Size of the camera picture, from the video element. */
  video: Box;
  /** Size of the box the picture is shown in, in CSS pixels. */
  box: Box;
  /** True for the front camera, which the page shows as a mirror. */
  mirrored: boolean;
};

/**
 * The video fills its box with object-fit: cover, so the picture is scaled up to cover the box and the edges
 * are cropped. The skeleton has to use the same scale and offset, or it drifts off the body, most of all
 * when the picture is 16:9 or 4:3 and the box is 3:4.
 */
export function coverFit(video: Box, box: Box): { scale: number; offsetX: number; offsetY: number } {
  if (!(video.width > 0) || !(video.height > 0) || !(box.width > 0) || !(box.height > 0)) return { scale: 1, offsetX: 0, offsetY: 0 };
  const scale = Math.max(box.width / video.width, box.height / video.height);
  return { scale, offsetX: (box.width - video.width * scale) / 2, offsetY: (box.height - video.height * scale) / 2 };
}

/** Where a 0 to 1 landmark lands in the box, in CSS pixels. The front camera is flipped the way the mirror shows it. */
export function projectPoint(p: { x: number; y: number }, view: OverlayView): { x: number; y: number } {
  const { scale, offsetX, offsetY } = coverFit(view.video, view.box);
  const x = p.x * view.video.width * scale + offsetX;
  const y = p.y * view.video.height * scale + offsetY;
  return { x: view.mirrored ? view.box.width - x : x, y };
}

export const BONES: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32],
];

/** A bone is drawn only when both ends are visible. Hidden joints leave a gap, not a guess. */
export function visibleBones(pose: Array<PosePoint & { visible?: boolean }>, min = VISIBILITY_MIN): Array<[number, number]> {
  const ok = (p: (PosePoint & { visible?: boolean }) | undefined) => !!p && p.visible !== false && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.v ?? 1) >= min;
  return BONES.filter(([a, b]) => ok(pose[a]) && ok(pose[b]));
}

/** Line width and dot size scale with the box, so the skeleton stays easy to read on a small phone or a big screen. */
export function strokeSizes(box: Box): { line: number; halo: number; dot: number } {
  const base = Math.max(6, Math.round(Math.min(box.width, box.height) / 45));
  return { line: base, halo: base + 4, dot: Math.round(base * 1.25) };
}
