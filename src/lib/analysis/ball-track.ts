// Ball tracking that runs on the player's own device, in the browser.
//
// This is the same pipeline as scripts/cv/ball_tracker.py (colour detection, a Kalman filter
// to smooth the path, bounce from the change in vertical direction, speed from the early
// frames, swing from sideways movement), written so it needs no server. The Python version
// cannot run on the website's hosting, and this way the video never leaves the phone.
//
// Differences from the Python version:
//  - Blobs are found by flood fill, not a Hough circle transform (no OpenCV in the browser).
//  - A blob only counts as the ball if it is moving, which stops a red sign, cone or stump
//    logo being picked up.
//  - There is no second-opinion AI detector and no pitch-crease calibration, so speed uses the
//    same rough rule the Python version falls back to: the frame is about one pitch wide.

export type BallPosition = { frame: number; x: number; y: number; radius: number; confidence: number };
export type Point = { x: number; y: number };

export type TrackResult = {
  frames_processed: number;
  fps: number;
  resolution: { w: number; h: number };
  ball_positions: BallPosition[];
  trajectory: Point[];
  bounce_frame: number | null;
  bounce_point: Point | null;
  speed_kph: number | null;
  swing_px: number;
  pitch_map: { px: number; py: number } | null;
  calibration: null;
};

/** Frames are sampled at this rate whatever the clip was filmed at */
export const SAMPLE_FPS = 30;
/** Only the first part of a clip is read: one delivery is over in a couple of seconds */
export const MAX_SECONDS = 10;
/** Frames are shrunk to this width before detection, to keep phones quick */
export const PROCESS_WIDTH = 960;
export const PITCH_LENGTH_M = 20.12;

// Ball size limits in full-size video pixels, as in the Python version
const RADIUS_MIN = 5;
const RADIUS_MAX = 40;
// A blob is moving if at least this share of it was not ball-coloured in the previous frame.
// (Brightness is no use for this: a red ball and green grass are about equally bright.)
const MOTION_SHARE = 0.3;
// A fast ball smears into an oval; anything longer than this is not a ball
const MIN_ASPECT = 0.35;
const MIN_FILL = 0.35;

/* ── Detection ─────────────────────────────────────────────────────────────── */

/** Is this pixel ball-coloured? Uses the same HSV ranges as the Python version. */
export function isBallColour(r: number, g: number, b: number, whiteBall: boolean): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const value = max;
  const saturation = max === 0 ? 0 : ((max - min) / max) * 255;
  if (whiteBall) return saturation <= 30 && value >= 200;
  if (saturation < 100 || value < 80) return false;
  // Hue in degrees; red sits at both ends of the circle
  const delta = max - min;
  let hue: number;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;
  return hue <= 20 || hue >= 320;
}

export type Candidate = { x: number; y: number; radius: number; confidence: number };

/**
 * Finds ball-like blobs in one frame: the right colour, the right size, roughly round, and
 * moving since the previous frame. Coordinates are in the pixels of the frame given.
 *
 * @param rgba      pixels, 4 bytes each
 * @param previous  which pixels were ball-coloured in the previous frame (one byte each), or null for the first
 * @param colour    filled in with the same for this frame, for the next call
 */
export function findCandidates(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  previous: Uint8Array | null,
  colour: Uint8Array,
  options: { whiteBall: boolean; minRadius: number; maxRadius: number },
): Candidate[] {
  const total = width * height;
  // 0 = not ball colour, 1 = ball colour and still, 2 = ball colour and moving, 3 = visited
  const mask = new Uint8Array(total);
  for (let i = 0, p = 0; i < total; i++, p += 4) {
    if (isBallColour(rgba[p], rgba[p + 1], rgba[p + 2], options.whiteBall)) {
      colour[i] = 1;
      mask[i] = previous && previous[i] === 0 ? 2 : 1;
    } else {
      colour[i] = 0;
    }
  }
  // Nothing to compare the first frame with, so nothing can be shown to be moving
  if (!previous) return [];

  const candidates: Candidate[] = [];
  const maxArea = Math.PI * options.maxRadius * options.maxRadius * 1.2;
  const stack: number[] = [];

  for (let start = 0; start < total; start++) {
    if (mask[start] !== 1 && mask[start] !== 2) continue;

    // Flood fill one blob
    let area = 0;
    let moving = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    stack.push(start);
    if (mask[start] === 2) moving++;
    mask[start] = 3;
    while (stack.length > 0) {
      const index = stack.pop() as number;
      const x = index % width;
      const y = (index - x) / width;
      area++;
      sumX += x;
      sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const neighbour = ny * width + nx;
          const state = mask[neighbour];
          if (state === 1 || state === 2) {
            if (state === 2) moving++;
            mask[neighbour] = 3;
            stack.push(neighbour);
          }
        }
      }
    }

    if (area > maxArea) continue;
    const boxW = maxX - minX + 1;
    const boxH = maxY - minY + 1;
    const radius = Math.max(boxW, boxH) / 2;
    if (radius < options.minRadius || radius > options.maxRadius) continue;
    if (Math.min(boxW, boxH) / Math.max(boxW, boxH) < MIN_ASPECT) continue;
    // How much of the blob's bounding oval is filled
    const fill = area / (Math.PI * (boxW / 2) * (boxH / 2));
    if (fill < MIN_FILL) continue;
    if (moving / area < MOTION_SHARE) continue;

    candidates.push({ x: sumX / area, y: sumY / area, radius, confidence: Math.min(1, fill) });
  }
  return candidates;
}

/* ── Kalman filter: position and velocity in two dimensions ────────────────── */

type Matrix = number[][];

const identity = (n: number, scale = 1): Matrix => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? scale : 0)));
const multiply = (a: Matrix, b: Matrix): Matrix => a.map((row) => b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)));
const transpose = (a: Matrix): Matrix => a[0].map((_, j) => a.map((row) => row[j]));
const add = (a: Matrix, b: Matrix): Matrix => a.map((row, i) => row.map((value, j) => value + b[i][j]));
const subtract = (a: Matrix, b: Matrix): Matrix => a.map((row, i) => row.map((value, j) => value - b[i][j]));

function invert2(m: Matrix): Matrix {
  const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  return [
    [m[1][1] / det, -m[0][1] / det],
    [-m[1][0] / det, m[0][0] / det],
  ];
}

const F: Matrix = [
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];
const H: Matrix = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
];
const Q = identity(4, 1e-2);
const R = identity(2, 1e-1);

/** Same model and noise settings as make_kalman() in the Python version. */
export function createKalman(x: number, y: number) {
  let state: Matrix = [[x], [y], [0], [0]];
  let covariance = identity(4);
  return {
    /** Pulls the estimate towards a sighting of the ball */
    correct(mx: number, my: number) {
      const innovation = subtract([[mx], [my]], multiply(H, state));
      const s = add(multiply(multiply(H, covariance), transpose(H)), R);
      const gain = multiply(multiply(covariance, transpose(H)), invert2(s));
      state = add(state, multiply(gain, innovation));
      covariance = multiply(subtract(identity(4), multiply(gain, H)), covariance);
    },
    /** Moves the estimate on one frame and returns where the ball should now be */
    predict(): Point {
      state = multiply(F, state);
      covariance = add(multiply(multiply(F, covariance), transpose(F)), Q);
      return { x: state[0][0], y: state[1][0] };
    },
    /** Where the ball is expected next, without moving the estimate on */
    peek(): Point {
      return { x: state[0][0] + state[2][0], y: state[1][0] + state[3][0] };
    },
  };
}

/* ── Measurements (straight ports of the Python functions) ─────────────────── */

/** Frame where the ball stops falling and starts rising (y grows downwards on screen). */
export function detectBounce(trajectory: Point[]): number | null {
  if (trajectory.length < 5) return null;
  const velocities: number[] = [];
  for (let i = 0; i < trajectory.length - 1; i++) velocities.push(trajectory[i + 1].y - trajectory[i].y);
  const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  for (let i = 2; i < velocities.length - 1; i++) {
    if (mean(velocities.slice(Math.max(0, i - 2), i)) > 1.5 && mean(velocities.slice(i, i + 2)) < -1.5) return i;
  }
  return null;
}

/** Sideways movement in pixels from release to bounce. Positive is to the right of the picture. */
export function measureSwing(trajectory: Point[], bounceFrame: number | null): number {
  if (trajectory.length < 3) return 0;
  const end = bounceFrame && bounceFrame < trajectory.length ? bounceFrame : trajectory.length - 1;
  return Math.round((trajectory[end].x - trajectory[0].x) * 10) / 10;
}

/** Speed from the first ten sightings, taking the frame to be one pitch length wide. */
export function estimateSpeed(positions: BallPosition[], fps: number, pitchLengthM: number, frameWidth: number): number | null {
  if (positions.length < 3) return null;
  const early = positions.slice(0, 10);
  let pixels = 0;
  for (let i = 1; i < early.length; i++) pixels += Math.hypot(early[i].x - early[i - 1].x, early[i].y - early[i - 1].y);
  // Sightings can skip frames, so time comes from the frame numbers
  const seconds = (early[early.length - 1].frame - early[0].frame) / fps;
  if (seconds <= 0) return null;
  const metres = pixels / (frameWidth / pitchLengthM);
  return Math.round((metres / seconds) * 3.6 * 10) / 10;
}

/* ── The tracker ───────────────────────────────────────────────────────────── */

export type TrackerOptions = {
  /** Size of the original video */
  videoWidth: number;
  videoHeight: number;
  whiteBall: boolean;
  fps?: number;
  pitchLengthM?: number;
};

/**
 * Feed it frames in order with push(), then call finish() for the result.
 * Frames may be smaller than the video; positions are reported in full-size video pixels.
 */
export function createTracker(options: TrackerOptions) {
  const fps = options.fps ?? SAMPLE_FPS;
  const pitchLengthM = options.pitchLengthM ?? PITCH_LENGTH_M;
  let previous: Uint8Array | null = null;
  let kalman: ReturnType<typeof createKalman> | null = null;
  let frame = 0;
  let framesSinceSeen = 0;
  const positions: BallPosition[] = [];
  const trajectory: Point[] = [];

  return {
    push(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number) {
      const scale = width / options.videoWidth;
      const colour = new Uint8Array(width * height);
      const candidates = findCandidates(rgba, width, height, previous, colour, {
        whiteBall: options.whiteBall,
        minRadius: Math.max(1.5, RADIUS_MIN * scale),
        maxRadius: RADIUS_MAX * scale,
      });
      previous = colour;

      // Pick the blob that fits the path so far; before there is a path, the roundest one
      let best: Candidate | null = null;
      if (candidates.length > 0) {
        if (kalman) {
          const expected = kalman.peek();
          // The longer the ball has been out of sight, the wider the search
          const gate = options.videoWidth * Math.min(0.5, 0.12 * (1 + framesSinceSeen));
          let bestDistance = gate;
          for (const candidate of candidates) {
            const distance = Math.hypot(candidate.x / scale - expected.x, candidate.y / scale - expected.y);
            if (distance < bestDistance) {
              bestDistance = distance;
              best = candidate;
            }
          }
        } else {
          best = candidates.reduce((a, b) => (b.confidence > a.confidence ? b : a));
        }
      }

      if (best) {
        const x = best.x / scale;
        const y = best.y / scale;
        if (!kalman) kalman = createKalman(x, y);
        kalman.correct(x, y);
        framesSinceSeen = 0;
        positions.push({
          frame,
          x: Math.round(x),
          y: Math.round(y),
          radius: Math.max(RADIUS_MIN, Math.round(best.radius / scale)),
          confidence: Math.round(best.confidence * 1000) / 1000,
        });
      } else {
        framesSinceSeen++;
      }

      // Always move on a frame, which fills the gaps when the ball is hidden
      if (kalman) trajectory.push(kalman.predict());
      frame++;
    },

    finish(): TrackResult {
      if (positions.length === 0) throw new Error('No ball detected in video');
      const bounceIndex = detectBounce(trajectory);
      const bounce = bounceIndex !== null ? trajectory[bounceIndex] : null;
      // The path starts at the first sighting; report the bounce as a frame of the video
      const bounceFrame = bounceIndex !== null ? positions[0].frame + bounceIndex : null;
      const round1 = (value: number) => Math.round(value * 10) / 10;
      return {
        frames_processed: frame,
        fps,
        resolution: { w: options.videoWidth, h: options.videoHeight },
        ball_positions: positions,
        trajectory: trajectory.map((p) => ({ x: round1(p.x), y: round1(p.y) })),
        bounce_frame: bounceFrame,
        bounce_point: bounce ? { x: round1(bounce.x), y: round1(bounce.y) } : null,
        speed_kph: estimateSpeed(positions, fps, pitchLengthM, options.videoWidth),
        swing_px: measureSwing(trajectory, bounceIndex),
        pitch_map: bounce
          ? {
              px: Math.round((bounce.x / options.videoWidth) * 1000) / 1000,
              py: Math.round((bounce.y / options.videoHeight) * 1000) / 1000,
            }
          : null,
        calibration: null,
      };
    },
  };
}

/* ── Reading a video in the browser ────────────────────────────────────────── */

function once(target: EventTarget, event: string, failEvent = 'error'): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      target.removeEventListener(event, done);
      target.removeEventListener(failEvent, failed);
      resolve();
    };
    const failed = () => {
      target.removeEventListener(event, done);
      target.removeEventListener(failEvent, failed);
      reject(new Error("This video can't be read here. MP4 and MOV clips work best."));
    };
    target.addEventListener(event, done);
    target.addEventListener(failEvent, failed);
  });
}

/**
 * Tracks the ball through a video file on this device. Steps through the clip frame by frame,
 * so it takes a few seconds; onProgress is called with 0 to 1 as it goes.
 */
export async function trackBallInVideo(
  file: Blob,
  options: { whiteBall: boolean; onProgress?: (done: number) => void },
): Promise<TrackResult> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  try {
    video.src = url;
    await once(video, 'loadeddata');
    // iPhones only hand over frames once the video has started at least once
    await video.play().catch(() => undefined);
    video.pause();

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (!videoWidth || !videoHeight) throw new Error("This video can't be read here. MP4 and MOV clips work best.");
    const duration = Number.isFinite(video.duration) ? video.duration : MAX_SECONDS;
    const frames = Math.max(1, Math.min(MAX_SECONDS * SAMPLE_FPS, Math.floor(duration * SAMPLE_FPS)));

    const scale = Math.min(1, PROCESS_WIDTH / videoWidth);
    const width = Math.round(videoWidth * scale);
    const height = Math.round(videoHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('This browser cannot read video frames.');

    const tracker = createTracker({ videoWidth, videoHeight, whiteBall: options.whiteBall });
    for (let i = 0; i < frames; i++) {
      // The middle of each frame's time slot, so rounding never lands on a neighbour
      const time = Math.min(Math.max(0, duration - 0.001), (i + 0.5) / SAMPLE_FPS);
      if (Math.abs(video.currentTime - time) > 1e-4) {
        const seeked = once(video, 'seeked');
        video.currentTime = time;
        await seeked;
      }
      context.drawImage(video, 0, 0, width, height);
      tracker.push(context.getImageData(0, 0, width, height).data, width, height);
      if (i % 5 === 0) {
        options.onProgress?.((i + 1) / frames);
        // Let the page repaint its progress bar
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    options.onProgress?.(1);
    return tracker.finish();
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
