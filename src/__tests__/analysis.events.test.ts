import {
  L, analyseDetailed, detectView, findContactFrame, findReleaseFrame, headBehindFrontKnee, headWobble,
  interpolateGaps, lockPerson, metricDefFor, overallScore, scoreFor, type Landmark,
} from '@/lib/analysis/pose-metrics';

const W = 200;
const H = 400;

function person(over: Partial<Record<keyof typeof L, [number, number]>> = {}, hidden: (keyof typeof L)[] = []): Landmark[] {
  const base: Record<keyof typeof L, [number, number]> = {
    nose: [100, 40], lShoulder: [90, 80], rShoulder: [110, 80],
    lElbow: [88, 120], rElbow: [112, 120], lWrist: [86, 160], rWrist: [114, 160],
    lHip: [92, 180], rHip: [108, 180], lKnee: [92, 250], rKnee: [108, 250],
    lAnkle: [90, 340], rAnkle: [110, 340],
  };
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  for (const [name, index] of Object.entries(L) as [keyof typeof L, number][]) {
    const [x, y] = over[name] ?? base[name];
    lm[index] = { x: x / W, y: y / H, visibility: hidden.includes(name) ? 0.05 : 0.95 };
  }
  return lm;
}

describe('event detection', () => {
  it('ignores a high hand in the run-up and takes release after the front foot lands', () => {
    const frames: Landmark[][] = [];
    for (let i = 0; i < 8; i++) {
      // Front foot is up, and the hand is already at the top of the picture.
      frames.push(person({ lAnkle: [90, 260], rWrist: [114, 20], rElbow: [112, 50] }));
    }
    frames.push(person({ lAnkle: [120, 340], rWrist: [114, 150], rElbow: [112, 120] }));
    frames.push(person({ lAnkle: [130, 345], rWrist: [114, 70], rElbow: [112, 40] }));
    frames.push(person({ lAnkle: [130, 346], rWrist: [114, 10], rElbow: [112, 40] }));
    frames.push(person({ lAnkle: [130, 346], rWrist: [90, 160], rElbow: [100, 120] }));
    expect(findReleaseFrame(frames, 'right', W, H)).toBe(10);
  });

  it('finds contact at the fastest movement of the bat hand', () => {
    const frames = Array.from({ length: 12 }, (_, i) => person({ rWrist: [114, 160 - i] }));
    frames[6] = person({ rWrist: [114, 40] });
    expect(findContactFrame(frames, 'right', W, H)).toBe(6);
  });

  it('does not penalise a head that has moved forward of the front knee', () => {
    // Front knee is the left knee. Nose sits further toward the front foot than the knee.
    const ahead = person({ nose: [70, 50], lKnee: [100, 250], lAnkle: [60, 340], rAnkle: [140, 340] });
    expect(headBehindFrontKnee(ahead, 'right', W, H)).toBe(0);
    const behind = person({ nose: [160, 50], lKnee: [80, 250], lAnkle: [60, 340], rAnkle: [140, 340] });
    expect(headBehindFrontKnee(behind, 'right', W, H)).toBeGreaterThan(0);
  });

  it('does not count a head that leans forward, only one that bobs', () => {
    const leaned = Array.from({ length: 8 }, (_, i) => person({ nose: [100 + i * 6, 40] }));
    const bobbed = Array.from({ length: 8 }, (_, i) => person({ nose: [100, 40 + (i % 2 === 0 ? 0 : 30)] }));
    expect(headWobble(leaned, W, H)!).toBeLessThan(0.05);
    expect(headWobble(bobbed, W, H)!).toBeGreaterThan(headWobble(leaned, W, H)!);
  });

  it('keeps head wobble small when the whole body strides sideways together', () => {
    const still = Array.from({ length: 8 }, (_, i) => person({
      nose: [100 + i * 8, 40], lShoulder: [90 + i * 8, 80], rShoulder: [110 + i * 8, 80],
      lHip: [92 + i * 8, 180], rHip: [108 + i * 8, 180],
      lKnee: [92 + i * 8, 250], rKnee: [108 + i * 8, 250],
      lAnkle: [90 + i * 8, 340], rAnkle: [110 + i * 8, 340],
    }));
    expect(headWobble(still, W, H)!).toBeLessThan(0.05);
  });
});

describe('tracking and view', () => {
  it('fills a two-frame gap and leaves a long gap empty', () => {
    const frames = [person(), person({ nose: [100, 40] }, ['nose']), person({ nose: [100, 40] }, ['nose']), person()];
    frames[1][L.nose].visibility = 0.05;
    frames[2][L.nose].visibility = 0.05;
    const filled = interpolateGaps(frames, 3);
    expect(filled[1][L.nose].visibility).toBeGreaterThanOrEqual(0.5);
    const long = [person(), ...Array.from({ length: 5 }, () => person({}, ['nose'])), person()];
    expect(interpolateGaps(long, 3)[3][L.nose].visibility).toBeLessThan(0.5);
  });

  it('follows the same person instead of jumping to a passer-by', () => {
    const batter = person();
    const other = person({ nose: [20, 30], lHip: [15, 60], rHip: [25, 60], lShoulder: [14, 40], rShoulder: [26, 40] });
    const first = chooseFrom(batter, other);
    const next = lockPerson([[batter, other], [other, batter]]);
    expect(next.crowded).toBe(true);
    expect(next.frames).toHaveLength(2);
    expect(first).toBeTruthy();
  });

  it('reads a wide shoulder line as front-on', () => {
    const side = Array.from({ length: 6 }, () => person());
    const front = Array.from({ length: 6 }, () => person({ lShoulder: [40, 80], rShoulder: [160, 80] }));
    expect(detectView(side, W, H).view).toBe('side');
    expect(detectView(front, W, H).view).toBe('front');
  });

  it('treats 159° as a straight bowling arm and 150° as a braced front knee', () => {
    expect(scoreFor(159, [150, 180], 20, 170)).toBeGreaterThanOrEqual(85);
    expect(scoreFor(150, [130, 180], 25, 150)).toBe(100);
    expect(scoreFor(120, [130, 180], 25, 150)).toBeLessThan(60);
  });

  it('keeps the score when the picture is smaller or the run-up is cut', () => {
    const clip = Array.from({ length: 16 }, (_, i) => person({
      rWrist: [114, i === 12 ? 15 : 170],
      rElbow: [112, i === 12 ? 45 : 125],
      lAnkle: [i < 8 ? 90 : 120, i < 8 ? 240 : 345],
    }));
    const full = analyseDetailed(clip, 'bowling', 'right', W, H);
    const small = analyseDetailed(clip, 'bowling', 'right', W / 2, H / 2);
    const trimmed = analyseDetailed(clip.slice(4), 'bowling', 'right', W, H);
    expect(full.ok && small.ok && trimmed.ok).toBe(true);
    if (!full.ok || !small.ok || !trimmed.ok) return;
    const a = overallScore(full.analysis.metrics);
    expect(Math.abs(a - overallScore(small.analysis.metrics))).toBeLessThanOrEqual(8);
    expect(Math.abs(a - overallScore(trimmed.analysis.metrics))).toBeLessThanOrEqual(12);
  });

  it('says when the feet are missing instead of claiming there is no one there', () => {
    const hidden = Array.from({ length: 12 }, () => person({}, ['lAnkle', 'rAnkle']));
    const marked = analyseDetailed(hidden, 'batting', 'right', W, H);
    if (marked.ok) expect(marked.analysis.warnings).toContain('feet out of frame');
    else expect(marked.problem).toBe('feet-out-of-frame');
    expect(analyseDetailed([], 'batting', 'right', W, H)).toEqual({ ok: false, problem: 'no-body' });
  });

  it('gives a pull its own elbow tip', () => {
    const tip = metricDefFor('frontElbow', 'batting', 'side', 'pull')?.tip ?? '';
    expect(tip.toLowerCase()).toContain('pull');
    expect(tip.toLowerCase()).not.toContain('lead with a high front elbow');
  });
});

function chooseFrom(a: Landmark[], b: Landmark[]) {
  return lockPerson([[a, b]]).frames[0];
}
