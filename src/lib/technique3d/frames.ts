import { prepareClip } from './figure';
import { detectEventsPrecise, type PreciseEvents } from './events-precise';
import type { CaptureStats, RawFrame } from './native-frames';
import type { AlignEvent, PoseFrame, TechniqueHand, TechniqueMode, Vec3 } from './types';

/** How each kept frame was obtained. Only 'measured' and 'low_confidence' came from the model; 'filled' is arithmetic. */
export type FrameQuality = 'measured' | 'low_confidence' | 'filled';

export const SLOMO_MESSAGE = 'Fast movement — film in slo-mo if your phone has it, side-on, whole body in shot, good light.';
/** Share of the action that must come from the model, or the player is asked to film it again. */
export const COVERAGE_MIN = 0.8;

const VIS_NORMAL = 0.5;
/** Arms move fastest at release and bat contact, and the model is least sure of them then. */
const VIS_FAST_ARM = 0.25;
/** Below this the joint is not seen at all, and the frame is not kept. */
const VIS_FLOOR = 0.1;
/** Wrist speed, in trunk lengths a second, above which an arm is treated as being in a fast phase. */
const FAST_TRUNK_PER_S = 2.5;

const BODY_JOINTS = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
const ARM_JOINTS = new Set([13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);

export type FrameStatus = 'measured' | 'low_confidence' | 'missing';
export type Assessed = RawFrame & { status: FrameStatus; fast: boolean };

function trunkLength(frame: Vec3[]): number {
  const mid = (a: Vec3, b: Vec3): Vec3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const s = mid(frame[11], frame[12]);
  const h = mid(frame[23], frame[24]);
  return Math.hypot(s[0] - h[0], s[1] - h[1], s[2] - h[2]);
}

/** Which frames the arms are moving fast in, from wrist speed against trunk length. Neighbours count too. */
export function fastFrames(raw: RawFrame[]): boolean[] {
  const fast = new Array<boolean>(raw.length).fill(false);
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1].world;
    const b = raw[i].world;
    const dt = raw[i].t - raw[i - 1].t;
    if (!a || !b || !(dt > 0)) continue;
    const trunk = trunkLength(b) || trunkLength(a);
    if (!(trunk > 0.1)) continue;
    for (const w of [15, 16]) {
      const speed = Math.hypot(b[w][0] - a[w][0], b[w][1] - a[w][1], b[w][2] - a[w][2]) / dt;
      if (speed / trunk > FAST_TRUNK_PER_S) { fast[i] = true; fast[i - 1] = true; }
    }
  }
  const spread = fast.slice();
  for (let i = 0; i < raw.length; i++) if (fast[i]) { if (i > 0) spread[i - 1] = true; if (i < raw.length - 1) spread[i + 1] = true; }
  return spread;
}

/**
 * Decides what each frame is. A frame the model gave a body for is kept, and flagged as low confidence when some joint
 * is under its line. The line for the arms is lowered in fast phases. A frame is dropped only when the body is not
 * there, or when a joint is under the floor, where the model is guessing.
 */
export function assessFrames(raw: RawFrame[]): Assessed[] {
  const fast = fastFrames(raw);
  return raw.map((frame, i) => {
    if (!frame.world || frame.world.some((p) => p.some((v) => !Number.isFinite(v)))) return { ...frame, status: 'missing', fast: fast[i] };
    const vis = frame.vis;
    if (!vis || vis.length < 33) return { ...frame, status: 'measured', fast: fast[i] };
    let belowLine = false;
    for (const joint of BODY_JOINTS) {
      const v = vis[joint] ?? 0;
      if (v < VIS_FLOOR) return { ...frame, status: 'missing', fast: fast[i] };
      const line = ARM_JOINTS.has(joint) && fast[i] ? VIS_FAST_ARM : VIS_NORMAL;
      if (v < line) belowLine = true;
    }
    return { ...frame, status: belowLine ? 'low_confidence' : 'measured', fast: fast[i] };
  });
}

function blend(a: Vec3[], b: Vec3[], w: number): Vec3[] {
  return a.map((p, k) => [p[0] + (b[k][0] - p[0]) * w, p[1] + (b[k][1] - p[1]) * w, p[2] + (b[k][2] - p[2]) * w] as Vec3);
}

/** Longest run of missing frames that is filled: about 4 frames at 30 fps, and the same length in time at higher rates. */
export function maxGapFrames(fps: number, stride = 1): number {
  return Math.max(1, Math.round(Math.max(4, (4 * fps) / 30) / stride));
}

type Kept = { raw: Assessed; world: Vec3[]; image: Vec3[] | null; quality: FrameQuality };

/** Fills runs of missing frames up to `maxGap` by straight-line interpolation between the frames either side. They are marked 'filled'. */
export function fillShortGaps(frames: Assessed[], maxGap: number): Array<Kept | null> {
  const out: Array<Kept | null> = frames.map((f) => (f.status === 'missing' || !f.world ? null : { raw: f, world: f.world, image: f.image, quality: f.status }));
  let i = 0;
  while (i < out.length) {
    if (out[i]) { i++; continue; }
    const start = i;
    while (i < out.length && !out[i]) i++;
    const gap = i - start;
    const before = out[start - 1];
    const after = out[i];
    if (!before || !after || gap > maxGap) continue;
    for (let k = 0; k < gap; k++) {
      const w = (k + 1) / (gap + 1);
      const image = before.image && after.image ? blend(before.image, after.image, w) : null;
      out[start + k] = { raw: frames[start + k], world: blend(before.world, after.world, w), image, quality: 'filled' };
    }
  }
  return out;
}

const SG = [-3, 12, 17, 12, -3];

/** Savitzky–Golay (window 5, quadratic) on each coordinate, within runs of neighbouring frames. Run ends are left as they are. */
export function smoothRuns(frames: Vec3[][], contiguous: boolean[]): Vec3[][] {
  const out = frames.map((f) => f.map((p) => [...p] as Vec3));
  for (let i = 2; i < frames.length - 2; i++) {
    if (!contiguous[i - 1] || !contiguous[i] || !contiguous[i + 1] || !contiguous[i + 2]) continue;
    for (let j = 0; j < frames[i].length; j++) {
      for (let c = 0; c < 3; c++) {
        let v = 0;
        for (let k = -2; k <= 2; k++) v += SG[k + 2] * frames[i + k][j][c];
        out[i][j][c] = v / 35;
      }
    }
  }
  return out;
}

export type PhaseName = 'run_up' | 'back_foot_to_front_foot' | 'front_foot_to_release' | 'follow_through';

export type ClipGap = {
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  /** Planned frames in the gap. */
  frames: number;
  /** True when interpolation covered it. A gap that was filled is still not counted as captured. */
  filled: boolean;
  phase: PhaseName;
  /** True when a key moment falls inside the gap. */
  coversEvent: AlignEvent | null;
};

export type ClipReport = {
  sourceFps: number;
  fpsEstimated: boolean;
  nativeFrames: number;
  stride: number;
  framesSampled: number;
  framesWithPose: number;
  framesMeasured: number;
  /** Kept and flagged, not discarded. A hard 0.5 line would have dropped these. */
  framesLowConfidence: number;
  framesFilled: number;
  /** The model gave no body, or a joint was under the floor, and no short gap could cover it. */
  framesDropped: number;
  /** Of the frames the model read, those with no body at all, and those with a joint under the confidence floor. */
  framesNoPose: number;
  framesDroppedLowVisibility: number;
  /** Frames in the action window and the share of them the model really saw. Filled frames do not count. */
  actionFrames: number;
  coverage: number;
  window: { from: number; to: number } | null;
  gaps: ClipGap[];
  captured: CaptureStats | null;
};

export type AnalysedClip = {
  times: number[];
  frames: PoseFrame[];
  images: Array<PoseFrame | null>;
  quality: FrameQuality[];
  /** Native frame number of each kept frame. */
  indices: number[];
  events: PreciseEvents;
  report: ClipReport;
};

export function phaseAt(time: number, events: PreciseEvents, mode: TechniqueMode): PhaseName {
  const back = events.back_foot_contact?.time;
  const front = events.front_foot_contact?.time;
  const end = (mode === 'bowling' ? events.release : events.bat_ball_contact)?.time;
  if (back === undefined || time < back) return 'run_up';
  if (front === undefined || time < front) return 'back_foot_to_front_foot';
  if (end === undefined || time < end) return 'front_foot_to_release';
  return 'follow_through';
}

/**
 * Turns every frame read from a clip into what the 3D view and the angle readings use: low-confidence frames kept and
 * flagged, short gaps filled and marked, a light smoothing, key moments between frames, and the coverage numbers.
 */
export function analyseClip(
  raw: RawFrame[],
  opts: { mode: TechniqueMode; hand: TechniqueHand; fps: number; stride?: number; duration: number; captured?: CaptureStats | null },
): AnalysedClip {
  const stride = opts.stride ?? 1;
  const assessed = assessFrames(raw);
  const filled = fillShortGaps(assessed, maxGapFrames(opts.fps, stride));

  const keptAt = filled.map((k, i) => (k ? i : -1)).filter((i) => i >= 0);
  const kept = keptAt.map((i) => filled[i]!);
  const contiguous = keptAt.map((at, k) => k === 0 || at - keptAt[k - 1] === 1);
  const smoothedWorld = smoothRuns(kept.map((k) => k.world), contiguous);
  const images = kept.map((k) => (k.image ? k.image.map((p) => [...p] as Vec3) : null));
  const times = kept.map((k) => k.raw.t);
  // The same repair the 3D view always used: upright, lifted into the picture, feet planted.
  const centred = prepareClip(smoothedWorld, images);
  const upright = prepareClip(smoothedWorld, images, false);
  const events = detectEventsPrecise(upright, times, opts.mode, opts.hand);

  // The action window runs from just before the back foot lands to a little after release or contact.
  const endEvent = opts.mode === 'bowling' ? events.release : events.bat_ball_contact;
  const clean = !!events.back_foot_contact && !!endEvent && endEvent.clean && endEvent.time > events.back_foot_contact.time;
  const window = clean ? { from: Math.max(0, events.back_foot_contact!.time - 0.3), to: endEvent!.time + (opts.mode === 'bowling' ? 0.5 : 0.4) } : null;
  const inWindow = (t: number) => (window ? t >= window.from && t <= window.to : true);

  let actionFrames = 0;
  let seen = 0;
  const gaps: ClipGap[] = [];
  let run: { start: number; end: number } | null = null;
  const close = () => {
    if (!run) return;
    const a = raw[run.start];
    const b = raw[run.end];
    const all = filled.slice(run.start, run.end + 1).every(Boolean);
    const covers = (Object.entries(events) as Array<[AlignEvent, { time: number }]>).find(([, e]) => e.time >= a.t - 1e-9 && e.time <= b.t + 1e-9)?.[0] ?? null;
    gaps.push({
      startIndex: a.index, endIndex: b.index, startTime: a.t, endTime: b.t,
      frames: run.end - run.start + 1, filled: all, phase: phaseAt((a.t + b.t) / 2, events, opts.mode), coversEvent: covers,
    });
    run = null;
  };
  raw.forEach((frame, i) => {
    const status = assessed[i].status;
    const real = status === 'measured' || status === 'low_confidence';
    if (inWindow(frame.t)) { actionFrames += 1; if (real) seen += 1; }
    if (!real) {
      run = run ? { start: run.start, end: i } : { start: i, end: i };
    } else close();
  });
  close();

  const count = (s: FrameStatus) => assessed.filter((a) => a.status === s).length;
  const framesFilled = filled.filter((k) => k?.quality === 'filled').length;
  const report: ClipReport = {
    sourceFps: opts.fps,
    fpsEstimated: opts.captured?.fpsEstimated ?? false,
    nativeFrames: opts.captured?.nativeFrames ?? raw.length,
    stride,
    framesSampled: raw.length,
    framesWithPose: count('measured') + count('low_confidence'),
    framesMeasured: count('measured'),
    framesLowConfidence: count('low_confidence'),
    framesFilled,
    framesDropped: filled.filter((k) => !k).length,
    framesNoPose: assessed.filter((a) => a.status === 'missing' && !a.world).length,
    framesDroppedLowVisibility: assessed.filter((a) => a.status === 'missing' && !!a.world).length,
    actionFrames,
    coverage: actionFrames > 0 ? Math.round((seen / actionFrames) * 1000) / 1000 : 0,
    window,
    gaps,
    captured: opts.captured ?? null,
  };
  return { times, frames: centred, images, quality: kept.map((k) => k.quality), indices: kept.map((k) => k.raw.index), events, report };
}

export function coverageLow(report: Pick<ClipReport, 'coverage'>): boolean {
  return report.coverage < COVERAGE_MIN;
}

/** One line per clip for the browser console. It holds counts and times only, never a picture or a landmark. */
export function logLine(report: ClipReport): string {
  const phases = report.gaps.map((g) => `${g.phase}${g.coversEvent ? `@${g.coversEvent}` : ''}:${g.frames}f${g.filled ? '(filled)' : ''}`).join(', ') || 'none';
  return `[technique3d] fps=${report.sourceFps}${report.fpsEstimated ? ' (estimated)' : ''} sampled=${report.framesSampled}/${report.nativeFrames} withPose=${report.framesWithPose} lowConfidenceKept=${report.framesLowConfidence} filled=${report.framesFilled} dropped=${report.framesDropped} (noPose=${report.framesNoPose} lowVisibility=${report.framesDroppedLowVisibility}) coverage=${Math.round(report.coverage * 100)}% gaps=[${phases}]`;
}
