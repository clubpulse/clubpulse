import type { PoseFrame, Vec3 } from './types';

export type DetectedPose = { world: Vec3[]; image?: Vec3[] | null };

export const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm';
export const FULL_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

/**
 * Step through a clip and keep the world landmarks MediaPipe returns.
 * The model runs in the browser. This function does not open the network itself.
 */
function copyPoints(points: Vec3[]): PoseFrame | null {
  if (points.length < 33) return null;
  const frame = points.slice(0, 33).map((point) => [point[0], point[1], point[2]] as Vec3);
  if (frame.some((point) => point.some((value) => !Number.isFinite(value)))) return null;
  return frame;
}

/** Times spread across the whole clip. A long action is not cut off after the opening. */
export function sampleTimes(duration: number, maxFrames = 120, maxSeconds = 180): number[] {
  const span = Math.min(Math.max(duration, 0), maxSeconds);
  if (span <= 0) return [];
  const count = Math.min(maxFrames, Math.max(2, Math.ceil(span * 12)));
  const step = span / (count - 1);
  return Array.from({ length: count }, (_, index) => Math.round(Math.min(span, index * step) * 1000) / 1000);
}

export async function sampleClip(options: {
  duration: number;
  seek: (time: number) => Promise<void>;
  detect: () => Vec3[] | DetectedPose | null;
  maxFrames?: number;
  maxSeconds?: number;
}): Promise<{ times: number[]; frames: PoseFrame[]; images: Array<PoseFrame | null> }> {
  const plan = sampleTimes(options.duration, options.maxFrames ?? 120, options.maxSeconds ?? 180);
  const times: number[] = [];
  const frames: PoseFrame[] = [];
  const images: Array<PoseFrame | null> = [];
  for (const time of plan) {
    await options.seek(time);
    const found = options.detect();
    const world = Array.isArray(found) ? found : found?.world ?? null;
    const image = Array.isArray(found) ? null : found?.image ?? null;
    if (!world) continue;
    const frame = copyPoints(world);
    if (!frame) continue;
    times.push(time);
    frames.push(frame);
    images.push(image ? copyPoints(image) : null);
  }
  return { times, frames, images };
}
