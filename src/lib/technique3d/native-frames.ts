import type { Vec3 } from './types';

/**
 * What the model returned for one video frame. `vis` is the per-landmark confidence the model gives (0 to 1).
 * `world` is null when no body was found.
 */
export type RawFrame = {
  /** Native frame number in the clip: 0 is the first picture. */
  index: number;
  /** Seconds into the clip, at the middle of the frame's time on screen. */
  t: number;
  world: Vec3[] | null;
  image: Vec3[] | null;
  vis: number[] | null;
};

export type Detection = { world: Vec3[]; image?: Vec3[] | null; vis?: number[] | null };

/** Which way each frame was read. A frame read by the playing pass was shown by the browser; the seek pass fills what it skipped. */
export type CaptureStats = {
  fps: number;
  fpsEstimated: boolean;
  nativeFrames: number;
  /** Every n-th frame is read only when the clip is longer than the cap. 1 means every frame. */
  stride: number;
  planned: number;
  readByPlaying: number;
  readBySeeking: number;
  /** Frames the playing pass did not see, which the seek pass went back for. */
  skippedByPlayer: number;
  /** Frames neither pass could read. */
  unreadable: number;
};

export const MAX_CLIP_SECONDS = 20;
/** Upper bound on frames read from one clip. Above it, every second (or third…) frame is read and the report says so. */
export const MAX_NATIVE_FRAMES = 1200;
export const DEFAULT_FPS = 30;

export type FrameIO = {
  duration: number;
  /** The clip's frame rate when it is known. Otherwise it is estimated from the frames the player shows. */
  fps?: number | null;
  /**
   * Plays the clip and calls `onFrame(mediaTime)` as each picture is shown (requestVideoFrameCallback).
   * Leave it out where the browser does not have that, and every frame is read by seeking.
   * `onFrame` returns once the model has read that picture.
   */
  playPass?: (onFrame: (mediaTime: number) => Detection | null | void) => Promise<void>;
  /** Moves to a time and resolves once that picture is on screen. */
  seek: (time: number) => Promise<void>;
  detect: () => Detection | null;
  onProgress?: (done: number, total: number) => void;
};

/** Frame rate from the gaps between shown pictures. The median ignores a stall or a dropped frame. */
export function estimateFps(mediaTimes: number[]): number | null {
  const gaps: number[] = [];
  for (let i = 1; i < mediaTimes.length; i++) {
    const gap = mediaTimes[i] - mediaTimes[i - 1];
    if (gap > 1e-4 && gap < 0.2) gaps.push(gap);
  }
  if (gaps.length < 3) return null;
  gaps.sort((a, b) => a - b);
  // A picture the player skipped makes a gap of two or three frames, never less than one. So the true spacing is
  // the short end of the gaps, not the middle. The lower quartile also shrugs off a rare odd timestamp.
  const spacing = gaps[Math.floor((gaps.length - 1) * 0.25)];
  const fps = 1 / spacing;
  // Snap to the usual rates so 29.97 and 30.02 both read as the same clip. The nearest rate wins.
  let best: number | null = null;
  for (const common of [24, 25, 29.97, 30, 48, 50, 59.94, 60, 120, 240]) {
    const off = Math.abs(fps - common) / common;
    if (off < 0.02 && (best === null || off < Math.abs(fps - best) / best)) best = common;
  }
  return best ?? Math.round(fps * 100) / 100;
}

/** Native frame numbers to read, and the time at the middle of each frame, which is a safe place to seek to. */
export function planFrames(duration: number, fps: number, maxFrames = MAX_NATIVE_FRAMES, maxSeconds = MAX_CLIP_SECONDS): { indices: number[]; stride: number; nativeFrames: number } {
  const span = Math.min(Math.max(duration, 0), maxSeconds);
  const nativeFrames = Math.floor(span * fps + 1e-6);
  if (nativeFrames <= 0) return { indices: [], stride: 1, nativeFrames: 0 };
  const stride = Math.max(1, Math.ceil(nativeFrames / maxFrames));
  const indices: number[] = [];
  for (let i = 0; i < nativeFrames; i += stride) indices.push(i);
  return { indices, stride, nativeFrames };
}

export const frameMidTime = (index: number, fps: number) => (index + 0.5) / fps;

/**
 * Reads every native frame of a clip once. The playing pass is quick and sees what the browser shows. Browsers
 * (iOS Safari most of all) skip pictures when the model is slower than the clip, so whatever it missed is read
 * by seeking to the middle of that frame. No frame is read twice and none is left out silently: what could not be
 * read is counted in `unreadable`.
 */
export async function captureNativeFrames(io: FrameIO): Promise<{ frames: RawFrame[]; stats: CaptureStats }> {
  let fps = io.fps && io.fps > 0 ? io.fps : null;
  let fpsEstimated = false;
  const seenTimes: number[] = [];
  const byIndex = new Map<number, RawFrame>();
  let readByPlaying = 0;

  const toFrame = (index: number, t: number, found: Detection | null | void): RawFrame => {
    const world = found?.world && found.world.length >= 33 ? found.world : null;
    return { index, t, world, image: found?.image ?? null, vis: found?.vis ?? null };
  };

  // Pass 1: play and read each shown picture.
  if (io.playPass) {
    const pending: Array<{ mediaTime: number; found: Detection | null | void }> = [];
    let origin: number | null = null;
    await io.playPass((mediaTime) => {
      seenTimes.push(mediaTime);
      if (origin === null) origin = mediaTime;
      const found = io.detect();
      pending.push({ mediaTime, found });
      return found;
    });
    if (!fps) {
      fps = estimateFps(seenTimes);
      fpsEstimated = fps !== null;
    }
    const rate = fps ?? DEFAULT_FPS;
    const t0 = origin ?? 0;
    // A clip's first picture is usually at 0. If the player's first time is later (or earlier), index from the first picture seen.
    const offset = t0 < 0.5 / rate ? 0 : t0;
    for (const { mediaTime, found } of pending) {
      const index = Math.round((mediaTime - offset) * rate);
      if (index < 0 || byIndex.has(index)) continue;
      byIndex.set(index, toFrame(index, frameMidTime(index, rate), found));
      readByPlaying += 1;
    }
  }
  if (!fps) {
    fps = DEFAULT_FPS;
    fpsEstimated = true;
  }

  const plan = planFrames(io.duration, fps);
  const planned = new Set(plan.indices);
  // Keep only the planned frames from the playing pass.
  for (const index of [...byIndex.keys()]) if (!planned.has(index)) byIndex.delete(index);
  const readBeforeSeek = byIndex.size;

  // Pass 2: seek to the middle of every planned frame the player skipped.
  let skippedByPlayer = 0;
  let readBySeeking = 0;
  let unreadable = 0;
  const missing = plan.indices.filter((index) => !byIndex.has(index));
  skippedByPlayer = io.playPass ? missing.length : 0;
  let done = readBeforeSeek;
  for (const index of missing) {
    const t = frameMidTime(index, fps);
    try {
      await io.seek(t);
      byIndex.set(index, toFrame(index, t, io.detect()));
      readBySeeking += 1;
    } catch {
      unreadable += 1;
    }
    done += 1;
    io.onProgress?.(done, plan.indices.length);
  }

  const frames = plan.indices.filter((index) => byIndex.has(index)).map((index) => byIndex.get(index)!);
  return {
    frames,
    stats: {
      fps,
      fpsEstimated,
      nativeFrames: plan.nativeFrames,
      stride: plan.stride,
      planned: plan.indices.length,
      readByPlaying: Math.min(readByPlaying, readBeforeSeek),
      readBySeeking,
      skippedByPlayer,
      unreadable,
    },
  };
}
