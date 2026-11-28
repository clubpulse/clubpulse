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

export async function sampleClip(options: {
  duration: number;
  seek: (time: number) => Promise<void>;
  detect: () => Vec3[] | DetectedPose | null;
  maxFrames?: number;
  maxSeconds?: number;
}): Promise<{ times: number[]; frames: PoseFrame[]; images: Array<PoseFrame | null> }> {
  const maxFrames = options.maxFrames ?? 160;
  const maxSeconds = options.maxSeconds ?? 8;
  const duration = Math.min(Math.max(options.duration, 0), maxSeconds);
  if (duration <= 0) return { times: [], frames: [], images: [] };
  const step = Math.max(1 / 15, duration / maxFrames);
  const times: number[] = [];
  const frames: PoseFrame[] = [];
  const images: Array<PoseFrame | null> = [];
  for (let time = 0; time <= duration + 1e-6 && frames.length < maxFrames; time += step) {
    await options.seek(Math.min(time, duration));
    const found = options.detect();
    const world = Array.isArray(found) ? found : found?.world ?? null;
    const image = Array.isArray(found) ? null : found?.image ?? null;
    if (!world) continue;
    const frame = copyPoints(world);
    if (!frame) continue;
    times.push(Math.round(Math.min(time, duration) * 1000) / 1000);
    frames.push(frame);
    images.push(image ? copyPoints(image) : null);
  }
  return { times, frames, images };
}
