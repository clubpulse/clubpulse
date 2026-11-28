import { sampleTimes } from '@/lib/technique3d/capture';
import { detectEventsPrecise, frameAtFractional } from '@/lib/technique3d/events-precise';
import { COVERAGE_MIN, SLOMO_MESSAGE, analyseClip, coverageLow, maxGapFrames } from '@/lib/technique3d/frames';
import { anglesAt } from '@/lib/technique3d/math';
import { DEFAULT_FPS, captureNativeFrames, estimateFps, planFrames, type Detection } from '@/lib/technique3d/native-frames';
import { MAX_FRAMES, parseTechniquePose } from '@/lib/technique3d/payload';
import type { Vec3 } from '@/lib/technique3d/types';
import { BACK_FOOT_T, DURATION, FRONT_FOOT_T, RELEASE_T, bowlerAt, synthClip, truthRelease } from './helpers/bowler-model';

// Tolerances, set before the code was run against the model.
const PHASE_TOL_S = 1 / 30; // phase times at 30 fps and 120 fps agree within one 30 fps frame
const ELBOW_KNEE_TOL_DEG = 6;
const SEPARATION_TOL_DEG = 8;

const opts = (fps: number) => ({ mode: 'bowling' as const, hand: 'right' as const, fps, duration: DURATION });
const BODY = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

/** What the old capture did: 12 pictures a second, a joint under 0.5 meant the frame was thrown away. Share of the action's real frames it saw. */
function legacyCoverage(frames: ReturnType<typeof synthClip>, fps: number, window: { from: number; to: number }) {
  const picks = sampleTimes(DURATION).map((t) => Math.min(frames.length - 1, Math.floor(t * fps)));
  const kept = new Set(picks.filter((i) => frames[i].world && BODY.every((j) => (frames[i].vis?.[j] ?? 0) >= 0.5)));
  const inWindow = frames.filter((f) => f.t >= window.from && f.t <= window.to);
  const seen = inWindow.filter((f) => kept.has(f.index)).length;
  return seen / inWindow.length;
}

describe('the synthetic bowler', () => {
  it('has rigid limbs and the truth the tests rely on', () => {
    const f = bowlerAt(0.95);
    const d = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    expect(d(f[12], f[14])).toBeCloseTo(0.3, 6);
    expect(d(f[14], f[16])).toBeCloseTo(0.27, 6);
    expect(d(f[23], f[25])).toBeCloseTo(0.42, 6);
    expect(Math.abs(truthRelease() - RELEASE_T)).toBeLessThan(0.08);
  });
});

describe('phase timing and angles at 30 fps and 120 fps', () => {
  const at30 = analyseClip(synthClip({ fps: 30 }), opts(30));
  const at120 = analyseClip(synthClip({ fps: 120 }), opts(120));
  const release = truthRelease();

  it('finds the three moments within one 30 fps frame of each other', () => {
    for (const event of ['back_foot_contact', 'front_foot_contact', 'release'] as const) {
      const a = at30.events[event]!;
      const b = at120.events[event]!;
      expect(Math.abs(a.time - b.time)).toBeLessThanOrEqual(PHASE_TOL_S);
    }
  });

  it('puts each moment within one 30 fps frame of the truth at both rates', () => {
    for (const clip of [at30, at120]) {
      expect(Math.abs(clip.events.back_foot_contact!.time - BACK_FOOT_T)).toBeLessThanOrEqual(PHASE_TOL_S);
      expect(Math.abs(clip.events.front_foot_contact!.time - FRONT_FOOT_T)).toBeLessThanOrEqual(PHASE_TOL_S);
      expect(Math.abs(clip.events.release!.time - release)).toBeLessThanOrEqual(PHASE_TOL_S);
    }
  });

  it('keeps the angles at release close to the truth at both rates', () => {
    const truth = anglesAt(bowlerAt(release), 'right');
    for (const clip of [at30, at120]) {
      const read = anglesAt(frameAtFractional(clip.frames, clip.events.release!.frame), 'right');
      expect(Math.abs(read.frontElbow! - truth.frontElbow!)).toBeLessThanOrEqual(ELBOW_KNEE_TOL_DEG);
      expect(Math.abs(read.frontKnee! - truth.frontKnee!)).toBeLessThanOrEqual(ELBOW_KNEE_TOL_DEG);
      expect(Math.abs(read.shoulderHip! - truth.shoulderHip!)).toBeLessThanOrEqual(SEPARATION_TOL_DEG);
    }
  });

  it('reads the release between frames, not on one', () => {
    const frame = at30.events.release!.frame;
    expect(Number.isFinite(frame)).toBe(true);
    // a real peak between two pictures is almost never a whole number
    expect(Math.abs(frame - Math.round(frame))).toBeGreaterThan(0);
  });
});

describe('coverage against the old capture', () => {
  // The old rule drops arm frames under 0.5, and the model is unsure of the arm around release (0.32).
  const dropAt = (t: number) => (t > 0.3 && t < 0.35) || (t > 0.72 && t < 0.78) || (t > 1.1 && t < 1.14);
  for (const fps of [30, 120]) {
    it(`sees more of the action at ${fps} fps than the old capture, and reaches the minimum`, () => {
      const clip = synthClip({ fps, dropAt });
      const analysed = analyseClip(clip, opts(fps));
      const before = legacyCoverage(clip, fps, analysed.report.window!);
      expect(analysed.report.window).not.toBeNull();
      expect(analysed.report.coverage).toBeGreaterThan(before + 0.3);
      expect(analysed.report.coverage).toBeGreaterThanOrEqual(COVERAGE_MIN);
      expect(coverageLow(analysed.report)).toBe(false);
      console.info(`[coverage ${fps}fps] before(old capture)=${Math.round(before * 100)}% after=${Math.round(analysed.report.coverage * 100)}% lowConfidenceKept=${analysed.report.framesLowConfidence} filled=${analysed.report.framesFilled}`);
    });
  }

  it('keeps frames the arm is unsure of, and flags them, instead of throwing them away', () => {
    const analysed = analyseClip(synthClip({ fps: 30 }), opts(30));
    // visibility 0.32 is above the fast-phase arm line (0.25) and under the normal 0.5 line
    expect(analysed.report.framesDropped).toBe(0);
    expect(analysed.report.framesMeasured + analysed.report.framesLowConfidence).toBe(analysed.report.framesWithPose);
  });

  it('flags a frame as low confidence when the arm is under its line', () => {
    const clip = synthClip({ fps: 30 }).map((f) => (Math.abs(f.t - RELEASE_T) < 0.04 ? { ...f, vis: f.vis!.map((v, j) => (j === 16 ? 0.15 : v)) } : f));
    const analysed = analyseClip(clip, opts(30));
    expect(analysed.report.framesLowConfidence).toBeGreaterThan(0);
    expect(analysed.quality.filter((q) => q === 'low_confidence').length).toBe(analysed.report.framesLowConfidence);
  });
});

describe('filled frames', () => {
  it('fills a short gap, marks the frames filled, and does not count them as captured', () => {
    const clip = synthClip({ fps: 30, dropFrames: [23, 24, 25] });
    const analysed = analyseClip(clip, opts(30));
    expect(analysed.report.framesFilled).toBe(3);
    expect(analysed.report.framesDropped).toBe(0);
    const filledAt = analysed.quality.map((q, i) => (q === 'filled' ? analysed.indices[i] : -1)).filter((i) => i >= 0);
    expect(filledAt).toEqual([23, 24, 25]);
    // coverage counts only frames the model saw: 3 missing frames in the window must lower it
    const window = analysed.report.window!;
    const inWindow = clip.filter((f) => f.t >= window.from && f.t <= window.to);
    const seen = inWindow.filter((f) => f.world).length;
    expect(analysed.report.coverage).toBeCloseTo(seen / inWindow.length, 2);
    expect(analysed.report.coverage).toBeLessThan(1);
    const gap = analysed.report.gaps.find((g) => g.startIndex === 23)!;
    expect(gap.filled).toBe(true);
    expect(gap.frames).toBe(3);
  });

  it('leaves a longer gap alone', () => {
    expect(maxGapFrames(30)).toBe(4);
    expect(maxGapFrames(120)).toBe(16);
    const clip = synthClip({ fps: 30, dropFrames: [20, 21, 22, 23, 24, 25, 26, 27] });
    const analysed = analyseClip(clip, opts(30));
    expect(analysed.report.framesFilled).toBe(0);
    expect(analysed.report.framesDropped).toBe(8);
    expect(analysed.indices).not.toContain(23);
    expect(analysed.report.gaps.find((g) => g.startIndex === 20)!.filled).toBe(false);
  });

  it('reads where a gap falls against the phases', () => {
    const clip = synthClip({ fps: 30, dropFrames: [28, 29, 30] }); // about 0.93 to 1.0 s, around release
    const analysed = analyseClip(clip, opts(30));
    const gap = analysed.report.gaps.find((g) => g.startIndex === 28)!;
    expect(['front_foot_to_release', 'follow_through']).toContain(gap.phase);
  });
});

describe('the slow-motion message', () => {
  it('shows when too little of the action was captured', () => {
    // long runs of lost frames through the action
    const dropAt = (t: number) => (t > 0.45 && t < 0.7) || (t > 0.85 && t < 1.15);
    const analysed = analyseClip(synthClip({ fps: 30, dropAt }), opts(30));
    expect(analysed.report.coverage).toBeLessThan(COVERAGE_MIN);
    expect(coverageLow(analysed.report)).toBe(true);
    expect(SLOMO_MESSAGE).toBe('Fast movement — film in slo-mo if your phone has it, side-on, whole body in shot, good light.');
  });
});

describe('capturing every native frame', () => {
  const fps = 30;
  const duration = 1.0;
  const make = (skip: (index: number) => boolean, extra: Partial<Parameters<typeof captureNativeFrames>[0]> = {}) => {
    let current = 0;
    const seeks: number[] = [];
    const found = (): Detection => ({ world: bowlerAt(0.5), image: null, vis: new Array(33).fill(0.9) });
    const io = {
      duration,
      playPass: async (onFrame: (mediaTime: number) => Detection | null | void) => {
        for (let index = 0; index < Math.round(duration * fps); index++) {
          if (skip(index)) continue;
          current = index;
          onFrame(index / fps);
        }
      },
      seek: async (t: number) => { seeks.push(t); current = Math.floor(t * fps); },
      detect: () => { void current; return found(); },
      ...extra,
    };
    return { io, seeks };
  };

  it('reads every native frame once when the player skips some', async () => {
    const { io, seeks } = make((i) => i % 3 === 1);
    const out = await captureNativeFrames(io);
    expect(out.frames.map((f) => f.index)).toEqual(Array.from({ length: 30 }, (_, i) => i));
    expect(out.stats.skippedByPlayer).toBe(10);
    expect(out.stats.readBySeeking).toBe(10);
    expect(out.stats.readByPlaying).toBe(20);
    expect(out.stats.unreadable).toBe(0);
    expect(out.stats.stride).toBe(1);
    // seeks aim at the middle of a frame, never an edge, so a phone shows that picture and not its neighbour
    for (const t of seeks) expect((t * fps) % 1).toBeCloseTo(0.5, 6);
  });

  it('seeks every frame when the player cannot report them', async () => {
    const { io } = make(() => false);
    const out = await captureNativeFrames({ ...io, playPass: undefined, fps });
    expect(out.frames).toHaveLength(30);
    expect(out.stats.readBySeeking).toBe(30);
    expect(out.stats.fpsEstimated).toBe(false);
  });

  it('estimates the frame rate from the shown pictures and falls back to 30', async () => {
    expect(estimateFps(Array.from({ length: 20 }, (_, i) => i / 60))).toBeCloseTo(60, 3);
    const { io } = make(() => false);
    const out = await captureNativeFrames(io);
    expect(out.stats.fps).toBeCloseTo(30, 1);
    expect(out.stats.fpsEstimated).toBe(true);
    expect(DEFAULT_FPS).toBe(30);
  });

  it('caps the read count and says so when a clip is long', () => {
    const plan = planFrames(20, 120);
    expect(plan.indices.length).toBeLessThanOrEqual(1200);
    expect(plan.stride).toBeGreaterThan(1);
    expect(planFrames(10, 30).stride).toBe(1);
  });
});

describe('event detection on its own', () => {
  it('gives the same answer for the same motion read twice as fast', () => {
    const a = analyseClip(synthClip({ fps: 60, seed: 3 }), opts(60));
    const b = analyseClip(synthClip({ fps: 120, seed: 4 }), opts(120));
    expect(Math.abs(a.events.release!.time - b.events.release!.time)).toBeLessThanOrEqual(PHASE_TOL_S);
    expect(detectEventsPrecise([], [], 'bowling', 'right')).toEqual({});
  });
});

describe('the saved estimate with per-frame quality', () => {
  const frame = bowlerAt(0.5);
  const make = (n: number, over: Record<string, unknown> = {}) => ({
    mode: 'bowling', hand: 'right', keyEvent: 'release', keyEventFrame: 3,
    times: Array.from({ length: n }, (_, i) => i / 120),
    frames: Array.from({ length: n }, () => frame),
    analysisId: null,
    ...over,
  });

  it('accepts a long clip up to the new cap, with quality, coverage and source fps', () => {
    const n = 400;
    const ok = parseTechniquePose(make(n, { quality: 'm'.repeat(n - 2) + 'lf', coverage: 0.93, sourceFps: 119.9 }));
    expect(ok.ok).toBe(true);
    expect(parseTechniquePose(make(MAX_FRAMES, {})).ok).toBe(true);
    expect(parseTechniquePose(make(MAX_FRAMES + 1, {})).ok).toBe(false);
  });

  it('still accepts a payload with no quality, as before', () => {
    expect(parseTechniquePose(make(20)).ok).toBe(true);
  });

  it('refuses quality of the wrong length or with other letters, and out-of-range numbers', () => {
    expect(parseTechniquePose(make(20, { quality: 'm'.repeat(19) })).ok).toBe(false);
    expect(parseTechniquePose(make(20, { quality: 'x'.repeat(20) })).ok).toBe(false);
    expect(parseTechniquePose(make(20, { coverage: 1.2 })).ok).toBe(false);
    expect(parseTechniquePose(make(20, { coverage: -0.1 })).ok).toBe(false);
    expect(parseTechniquePose(make(20, { sourceFps: 0 })).ok).toBe(false);
    expect(parseTechniquePose(make(20, { sourceFps: '30' })).ok).toBe(false);
    expect(parseTechniquePose(make(20, { extra: 1 })).ok).toBe(false);
  });
});
