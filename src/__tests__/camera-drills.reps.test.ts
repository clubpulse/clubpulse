import fs from 'fs';
import path from 'path';
import { J, jointAngle, type PosePoint } from '@/lib/camera-drills/pose';
import { OneEuroFilter, PoseSmoother, STALE_AFTER_S, VISIBILITY_MIN } from '@/lib/camera-drills/one-euro';
import { BONES, coverFit, projectPoint, strokeSizes, visibleBones } from '@/lib/camera-drills/overlay';
import { HoldTimer, RepCounter, SQUAT_CONFIG, countCycles, plankInPosition } from '@/lib/camera-drills/rep-counter';
import { DrillTracker, REACH_CONFIG, footLifted, formatSeconds, reachSignal } from '@/lib/camera-drills/session';
import { DRILLS, drillsFor } from '@/lib/camera-drills/plan';
import { FPS, gauss, plankFrame, rng, squatAngles, squatFrame, timesFor } from './helpers/pose-fixtures';

const squat = DRILLS.find((d) => d.key === 'squat')!;
const plank = DRILLS.find((d) => d.key === 'plank')!;

function run(angles: number[], opts: { noise?: number; seed?: number; mirror?: boolean; vis?: (i: number) => number } = {}) {
  const r = rng(opts.seed ?? 7);
  const tracker = new DrillTracker(squat);
  let last = tracker.readout();
  angles.forEach((angle, i) => {
    const frame = squatFrame(angle, { noise: opts.noise ?? 0.004, r, mirror: opts.mirror, vis: opts.vis?.(i) ?? 0.95 });
    last = tracker.push(frame, i / FPS).readout;
  });
  return { tracker, last };
}

describe('squat reps on joint sequences', () => {
  it('the fixture really has the knee angle it says', () => {
    const f = squatFrame(100);
    expect(jointAngle(f[J.lHip], f[J.lKnee], f[J.lAnkle])).toBeCloseTo(100, 3);
  });

  it('counts each full down-and-up cycle once, through the smoother', () => {
    const { last, tracker } = run(squatAngles({ reps: 5, depth: 90, repSeconds: 2.2 }));
    expect(last.count).toBe(5);
    expect(last.fill).toBeCloseTo(5 / 8, 3);
    expect(last.big).toBe('5 / 8 reps');
    expect(tracker.result().detail.reps).toBe(5);
  });

  it('does not count a half rep that never reaches the depth line, and says so', () => {
    const { last, tracker } = run(squatAngles({ reps: 5, depth: 130, repSeconds: 2 }));
    expect(last.count).toBe(0);
    expect(tracker.result().detail.partials).toBe(5);
    expect(last.cue).toMatch(/lower/i);
    expect(last.form).toBeLessThan(1);
  });

  it('does not count the person getting down but not standing back up', () => {
    const angles = [...squatAngles({ reps: 1, depth: 90, repSeconds: 2 }).slice(0, 60)];
    expect(run(angles).last.count).toBe(0);
  });

  it('does not double count when the angle shakes around the depth line or the standing line', () => {
    const r = rng(3);
    const a: number[] = [];
    for (let i = 0; i < 20; i++) a.push(172);
    for (let i = 0; i < 20; i++) a.push(172 - i * 3.3);           // down to ~106
    for (let i = 0; i < 90; i++) a.push(SQUAT_CONFIG.down + gauss(r) * 5); // shaking around the depth line for 3 s
    for (let i = 0; i < 20; i++) a.push(110 + i * 2.6);           // up to ~162
    for (let i = 0; i < 90; i++) a.push(SQUAT_CONFIG.up + gauss(r) * 5);  // shaking around the standing line for 3 s
    for (let i = 0; i < 20; i++) a.push(172);
    expect(countCycles(a, timesFor(a.length)).reps).toBe(1);
    expect(run(a).last.count).toBe(1);
  });

  it('a standing person with a shaky reading counts nothing', () => {
    const r = rng(11);
    const a = Array.from({ length: 300 }, () => 170 + gauss(r) * 3);
    expect(run(a).last.count).toBe(0);
  });

  it('keeps counting through short lost-confidence gaps, and counts the rep once', () => {
    const base = squatAngles({ reps: 3, depth: 90, repSeconds: 2.2 });
    const gap = (i: number) => (i >= 70 && i < 82) || (i >= 160 && i < 168) ? 0.1 : 0.95;
    expect(run(base, { vis: gap }).last.count).toBe(3);
  });

  it('counts fast reps at 30 fps and ignores a sub-half-second twitch', () => {
    expect(run(squatAngles({ reps: 6, depth: 95, repSeconds: 0.9, restSeconds: 0.3 })).last.count).toBe(6);
    expect(run(squatAngles({ reps: 4, depth: 95, repSeconds: 0.3, restSeconds: 0.5 })).last.count).toBe(0);
  });

  it('gives the same count for the mirrored front camera', () => {
    const angles = squatAngles({ reps: 4, depth: 90, repSeconds: 2 });
    expect(run(angles, { mirror: true }).last.count).toBe(run(angles).last.count);
  });

  it('uses whichever leg is visible, and nothing when neither is', () => {
    const rep = squatAngles({ reps: 2, depth: 90, repSeconds: 2 });
    const tracker = new DrillTracker(squat);
    rep.forEach((angle, i) => {
      const f = squatFrame(angle);
      f[J.rKnee] = { ...f[J.rKnee], v: 0.1 };
      tracker.push(f, i / FPS);
    });
    expect(tracker.readout().count).toBe(2);
    const blind = new DrillTracker(squat);
    rep.forEach((angle, i) => blind.push(squatFrame(angle, { vis: 0.1 }), i / FPS));
    expect(blind.readout().count).toBe(0);
  });

  it('the counter alone: a dip with a gap in the readings is still one rep', () => {
    const c = new RepCounter();
    const seq = [172, 150, 120, 100, NaN, NaN, 105, 130, 160, 172];
    seq.forEach((a, i) => c.push(a, i * 0.2));
    expect(c.state().reps).toBe(1);
  });
});

describe('reach reps', () => {
  const arm = (lift: number): PosePoint[] => {
    const f: PosePoint[] = Array.from({ length: 33 }, () => ({ x: 0, y: 0, v: 0.95 }));
    f[J.lShoulder] = { x: 0.4, y: 0.3, v: 0.95 }; f[J.lHip] = { x: 0.4, y: 0.6, v: 0.95 };
    const rad = (lift * Math.PI) / 180; // 0 hangs down, 180 is overhead
    f[J.lWrist] = { x: 0.4 + 0.25 * Math.sin(rad), y: 0.3 + 0.25 * Math.cos(rad), v: 0.95 };
    return f;
  };
  it('counts arm-overhead-and-back cycles, not knee bends', () => {
    const drill = DRILLS.find((d) => d.key === 'reach')!;
    const tracker = new DrillTracker(drill);
    let t = 0;
    for (let k = 0; k < 3; k++) {
      for (const lift of [5, 5, 40, 90, 140, 170, 170, 140, 90, 40, 5, 5]) tracker.push(arm(lift), (t += 0.15));
    }
    expect(tracker.readout().count).toBe(3);
    expect(reachSignal(arm(0))).toBeCloseTo(180, 0);
    expect(REACH_CONFIG.up).toBeGreaterThan(REACH_CONFIG.down);
  });
});

describe('timed holds', () => {
  it('counts the longest continuous hold and the total, and does not end on a short lost frame', () => {
    const h = new HoldTimer(0.5);
    let r = h.read();
    for (let i = 0; i <= 12 * FPS; i++) r = h.push(i >= 4 * FPS && i < 4 * FPS + 9 ? null : true, i / FPS);
    expect(r.current).toBeCloseTo(12, 0);
    expect(r.best).toBeCloseTo(12, 0);
    expect(r.holding).toBe(true);
  });

  it('a real break ends the hold, keeps the best and adds up the total', () => {
    const h = new HoldTimer(0.5);
    let r = h.read();
    let t = 0;
    for (let i = 0; i < 10 * FPS; i++) r = h.push(true, (t += 1 / FPS));
    for (let i = 0; i < 2 * FPS; i++) r = h.push(false, (t += 1 / FPS));
    expect(r.holding).toBe(false);
    for (let i = 0; i < 5 * FPS; i++) r = h.push(true, (t += 1 / FPS));
    expect(r.best).toBeGreaterThanOrEqual(9.5);
    expect(r.current).toBeLessThan(5.5);
    expect(r.total).toBeGreaterThan(14);
  });

  it('a long loss of the body (more than the grace time) ends the hold too', () => {
    const h = new HoldTimer(0.5);
    for (let i = 0; i < 60; i++) h.push(true, i / FPS);
    const r = h.push(null, 4);
    expect(r.holding).toBe(false);
  });

  it('knows a plank from a sag, a stand and an unseen body', () => {
    expect(plankInPosition(plankFrame())).toBe(true);
    expect(plankInPosition(plankFrame({ sag: 40 }))).toBe(false);
    expect(plankInPosition(plankFrame({ upright: true }))).toBe(false);
    expect(plankInPosition(plankFrame({ vis: 0.1 }))).toBeNull();
  });

  it('the plank drill shows seconds clearly and fills the ring with time held', () => {
    const tracker = new DrillTracker(plank);
    let out = tracker.readout();
    for (let i = 0; i <= 15 * FPS; i++) out = tracker.push(plankFrame(), i / FPS).readout;
    expect(out.mode).toBe('hold');
    expect(out.big).toBe('0:15');
    expect(out.fill).toBeCloseTo(15 / plank.target, 1);
    expect(tracker.result().detail.seconds).toBeGreaterThanOrEqual(14.5);
    expect(formatSeconds(75)).toBe('1:15');
  });

  it('balance is a hold: the lifted foot is timed, both legs are needed', () => {
    const balance = DRILLS.find((d) => d.key === 'balance')!;
    const t = new DrillTracker(balance);
    const frame = (leftUp: boolean, rightUp: boolean): PosePoint[] => {
      const f: PosePoint[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, v: 0.95 }));
      f[J.lAnkle] = { x: 0.45, y: leftUp ? 0.7 : 0.9, v: 0.95 };
      f[J.rAnkle] = { x: 0.55, y: rightUp ? 0.7 : 0.9, v: 0.95 };
      return f;
    };
    expect(footLifted(frame(true, false), 'left')).toBe(true);
    let time = 0;
    for (let i = 0; i < 5 * FPS; i++) t.push(frame(true, false), (time += 1 / FPS));
    expect(t.readout().count).toBe(0); // the right leg has not been done yet
    for (let i = 0; i < 6 * FPS; i++) t.push(frame(false, true), (time += 1 / FPS));
    expect(t.readout().count).toBeGreaterThan(4);
  });
});

describe('smoothing', () => {
  it('cuts the shake on a still joint to well under half', () => {
    const r = rng(5);
    const f = new OneEuroFilter();
    const raw: number[] = [];
    const out: number[] = [];
    for (let i = 0; i < 300; i++) { const v = 0.5 + gauss(r) * 0.006; raw.push(v); out.push(f.filter(v, i / FPS)); }
    const sd = (a: number[]) => { const m = a.reduce((s, x) => s + x, 0) / a.length; return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length); };
    expect(sd(out.slice(30))).toBeLessThan(sd(raw.slice(30)) * 0.5);
  });

  it('does not lag behind a quick move', () => {
    const f = new OneEuroFilter();
    for (let i = 0; i < 30; i++) f.filter(0.3, i / FPS);
    let v = 0; let frames = 0;
    for (let i = 30; i < 90; i++) { v = f.filter(0.7, i / FPS); frames += 1; if (v >= 0.3 + 0.4 * 0.9) break; }
    expect(frames).toBeLessThanOrEqual(10); // within a third of a second at 30 fps
  });

  it('hides joints below the visibility line and does not glide from an old spot when they return', () => {
    const s = new PoseSmoother();
    const frame = (x: number, v: number): PosePoint[] => Array.from({ length: 33 }, () => ({ x, y: 0.5, v }));
    expect(s.smooth(frame(0.2, 0.9), 0)[11]).toMatchObject({ visible: true });
    expect(s.smooth(frame(0.2, VISIBILITY_MIN - 0.1), 0.1)[11].visible).toBe(false);
    const back = s.smooth(frame(0.8, 0.9), 0.1 + STALE_AFTER_S + 0.2)[11];
    expect(back.x).toBeCloseTo(0.8, 5);
  });
});

describe('overlay', () => {
  const tall = { width: 300, height: 400 };

  it('covers the box the way object-fit: cover does, for 16:9 and 4:3 pictures', () => {
    const wide = coverFit({ width: 1280, height: 720 }, tall);
    expect(wide.scale).toBeCloseTo(400 / 720, 5);
    expect(wide.offsetY).toBeCloseTo(0, 5);
    expect(wide.offsetX).toBeLessThan(0); // the sides are cropped
    const four3 = coverFit({ width: 640, height: 480 }, tall);
    expect(four3.scale).toBeCloseTo(400 / 480, 5);
    const exact = coverFit({ width: 600, height: 800 }, tall);
    expect(exact.offsetX).toBeCloseTo(0, 5);
    expect(exact.offsetY).toBeCloseTo(0, 5);
  });

  it('puts the middle of the picture in the middle of the box, and keeps the picture shape', () => {
    const view = { video: { width: 1280, height: 720 }, box: tall, mirrored: false };
    const c = projectPoint({ x: 0.5, y: 0.5 }, view);
    expect(c.x).toBeCloseTo(150, 5);
    expect(c.y).toBeCloseTo(200, 5);
    const a = projectPoint({ x: 0.4, y: 0.4 }, view);
    const b = projectPoint({ x: 0.6, y: 0.6 }, view);
    expect((b.x - a.x) / (b.y - a.y)).toBeCloseTo(1280 / 720, 5); // not stretched to the box
  });

  it('flips left and right for the front camera', () => {
    const base = { video: { width: 640, height: 480 }, box: tall };
    const p = projectPoint({ x: 0.3, y: 0.5 }, { ...base, mirrored: false });
    const m = projectPoint({ x: 0.3, y: 0.5 }, { ...base, mirrored: true });
    expect(m.x).toBeCloseTo(tall.width - p.x, 5);
    expect(m.y).toBeCloseTo(p.y, 5);
  });

  it('leaves out any bone with a hidden or low-visibility end', () => {
    const pose: Array<PosePoint & { visible?: boolean }> = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, v: 0.95, visible: true }));
    expect(visibleBones(pose).length).toBe(BONES.length);
    pose[25] = { ...pose[25], v: 0.2 };
    pose[27] = { ...pose[27], visible: false };
    const drawn = visibleBones(pose);
    expect(drawn.some(([a, b]) => a === 25 || b === 25 || a === 27 || b === 27)).toBe(false);
    expect(drawn.length).toBeLessThan(BONES.length);
  });

  it('draws thick enough to read on a phone and thicker on a big box', () => {
    expect(strokeSizes({ width: 300, height: 400 }).line).toBeGreaterThanOrEqual(6);
    expect(strokeSizes({ width: 1200, height: 1600 }).line).toBeGreaterThan(strokeSizes({ width: 300, height: 400 }).line);
    const s = strokeSizes({ width: 300, height: 400 });
    expect(s.halo).toBeGreaterThan(s.line);
    expect(s.dot).toBeGreaterThan(s.line / 2);
  });
});

describe('privacy: the video never leaves the phone', () => {
  const root = path.join(__dirname, '..');
  const files = [
    'components/drills/DrillRunner.tsx', 'lib/camera-drills/session.ts', 'lib/camera-drills/rep-counter.ts',
    'lib/camera-drills/one-euro.ts', 'lib/camera-drills/overlay.ts', 'lib/camera-drills/reps.ts',
  ];
  it.each(files)('%s does not record, encode or send pictures', (file) => {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    expect(src).not.toMatch(/MediaRecorder|toBlob|toDataURL|FormData|XMLHttpRequest|sendBeacon|WebSocket|\bfetch\(|createImageBitmap|captureStream/);
  });

  it('only a score and a few numbers come out of a run, and the poses are dropped', () => {
    const tracker = new DrillTracker(squat);
    squatAngles({ reps: 2, depth: 90, repSeconds: 2 }).forEach((a, i) => tracker.push(squatFrame(a), i / FPS));
    const result = tracker.result();
    expect(Object.keys(result).sort()).toEqual(['detail', 'fill', 'form', 'line', 'score']);
    for (const value of Object.values(result.detail)) expect(typeof value).toBe('number');
    tracker.clear();
    expect(tracker.result().detail.reps).toBe(2); // the count survives, the frames do not
    expect(JSON.stringify(result)).not.toMatch(/"x"|landmark/);
  });

  it('keeps the plank out of the starting checks and the daily pick', () => {
    expect(drillsFor(false).some((d) => d.key === 'plank')).toBe(false);
    expect(drillsFor(true).some((d) => d.key === 'plank')).toBe(false);
  });
});
