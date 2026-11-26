import type { PoseFrame, Vec3 } from './types';

export const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm';
export const FULL_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

/**
 * Step through a clip and keep the world landmarks MediaPipe returns.
 * The model runs in the browser. This function does not open the network itself.
 */
export async function sampleClip(options: {
  duration: number;
  seek: (time: number) => Promise<void>;
  detect: () => Vec3[] | null;
  maxFrames?: number;
  maxSeconds?: number;
}): Promise<{ times: number[]; frames: PoseFrame[] }> {
  const maxFrames = options.maxFrames ?? 160;
  const maxSeconds = options.maxSeconds ?? 8;
  const duration = Math.min(Math.max(options.duration, 0), maxSeconds);
  if (duration <= 0) return { times: [], frames: [] };
  const step = Math.max(1 / 15, duration / maxFrames);
  const times: number[] = [];
  const frames: PoseFrame[] = [];
  for (let time = 0; time <= duration + 1e-6 && frames.length < maxFrames; time += step) {
    await options.seek(Math.min(time, duration));
    const world = options.detect();
    if (!world || world.length < 33) continue;
    const frame = world.slice(0, 33).map((point) => [point[0], point[1], point[2]] as Vec3);
    if (frame.some((point) => point.some((value) => !Number.isFinite(value)))) continue;
    times.push(Math.round(Math.min(time, duration) * 1000) / 1000);
    frames.push(frame);
  }
  return { times, frames };
}
