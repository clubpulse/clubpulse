import {
  L, LOW_CONFIDENCE_MESSAGE, LOW_FPS_MESSAGE, analyse, analyseDetailed, detectView, elbowAngle3D, findContact, findContactFrame, findRelease, findReleaseFrame, headBehindFrontKnee, headOnTrunk, headWobble,
  readingConfidence, upscaleFactor,
  interpolateGaps, lockPerson, metricDefFor, overallScore, resolveView, scoreFor, type Landmark,
} from '@/lib/analysis/pose-metrics';
import { shotToScore } from '@/lib/analysis/shot-detect';

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

  it('finds contact on the downswing, not in the stance', () => {
    const frames = Array.from({ length: 20 }, () => person({ rWrist: [114, 160] }));
    // A twitch while setting up, inside the first tenth of the clip.
    frames[1] = person({ rWrist: [20, 160] });
    for (let i = 6; i <= 10; i++) frames[i] = person({ rWrist: [114, 160 - (i - 5) * 24] });
    frames[11] = person({ rWrist: [114, 40] });
    frames[12] = person({ rWrist: [114, 40] });
    frames[13] = person({ rWrist: [114, 48] });
    frames[14] = person({ rWrist: [180, 150] });
    expect(findContactFrame(frames, 'right', W, H)).toBe(14);
  });

  it('does not keep a run-up landing when the arm comes over later', () => {
    const frames: Landmark[][] = [];
    for (let i = 0; i < 6; i++) frames.push(person({ lAnkle: [95, i < 3 ? 260 : 345], rWrist: [114, i === 4 ? 15 : 160] }));
    for (let i = 0; i < 24; i++) frames.push(person());
    frames.push(person({ rWrist: [114, 80], rElbow: [112, 50], lAnkle: [150, 345], rAnkle: [70, 340] }));
    frames.push(person({ rWrist: [114, 20], rElbow: [112, 40], lAnkle: [160, 346], rAnkle: [60, 340] }));
    frames.push(person({ rWrist: [90, 160], lAnkle: [160, 346], rAnkle: [60, 340] }));
    expect(findReleaseFrame(frames, 'right', W, H)).toBe(31);
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

  it('does not treat an unclear shoulder line as a confident view', () => {
    const ratio = (width: number) => {
      const frames = Array.from({ length: 6 }, () => person({ lShoulder: [100 - width / 2, 80], rShoulder: [100 + width / 2, 80] }));
      return detectView(frames, W, H);
    };
    expect(ratio(68).confident).toBe(false);
    expect(ratio(94).confident).toBe(false);
    expect(resolveView('front', ratio(68))).toEqual({ view: 'front', hint: null });
    expect(resolveView('side', ratio(94))).toEqual({ view: 'side', hint: null });
    expect(resolveView('side', { view: 'front', confident: true })).toEqual({ view: 'side', hint: 'This looks front-on. Switch?' });
    expect(resolveView('front', { view: 'side', confident: true })).toEqual({ view: 'front', hint: 'This looks side-on. Switch?' });
  });

  it('drops the front elbow for a pull and does not zero the head', () => {
    const frames = Array.from({ length: 12 }, () => person());
    const pull = analyse(frames, 'batting', 'right', W, H, 'pull');
    expect(pull?.some((metric) => metric.key === 'frontElbow')).toBe(false);
    expect(headOnTrunk(frames, W, H)!).toBeLessThan(0.05);
    const ideal = metricDefFor('headStability', 'batting', 'side', 'pull')?.ideal ?? [0, 0];
    expect(scoreFor(0.55, ideal, 0.35)).toBeGreaterThan(40);
  });

  it('withholds the score when the feet never appear', () => {
    const hidden = Array.from({ length: 12 }, () => person({}, ['lAnkle', 'rAnkle']));
    const marked = analyseDetailed(hidden, 'batting', 'right', W, H);
    if (marked.ok) {
      expect(marked.analysis.confidence).toBe('low');
      expect(LOW_CONFIDENCE_MESSAGE).toMatch(/whole body in frame/);
    }
  });

  it('keeps the shot the player chose when detection is unsure', () => {
    expect(shotToScore({ shot: 'drive', confident: false }, 'pull')).toBe('pull');
    expect(shotToScore({ shot: 'pull', confident: true }, 'auto')).toBe('pull');
  });

  it('takes the later extended arm, and ignores a run-up that is the only early peak', () => {
    const frames: Landmark[][] = [];
    const times: number[] = [];
    for (let i = 0; i < 30; i++) {
      const t = i / 10;
      times.push(t);
      const delivery = Math.abs(t - 2.2) < 0.05;
      frames.push(person(delivery
        ? { rWrist: [114, 12], rElbow: [112, 40] }
        : { rWrist: [114, t < 0.15 ? 8 : 170] }));
    }
    const at = findReleaseFrame(frames, 'right', W, H, times);
    expect(times[at ?? 0]).toBeCloseTo(2.2, 1);
    const trimmed = frames.filter((_, i) => times[i] >= 0.3);
    const trimmedTimes = times.filter((t) => t >= 0.3);
    const later = findReleaseFrame(trimmed, 'right', W, H, trimmedTimes);
    expect(later).not.toBeNull();
    expect(trimmedTimes[later ?? 0]).toBeGreaterThan(2);
    const onlyEarly = frames.map((lm, i) => (times[i] < 0.2 ? lm : person()));
    expect(findReleaseFrame(onlyEarly, 'right', W, H, times)).toBeNull();
  });

  it('marks a folded side-on bowling arm as low confidence', () => {
    const body = Array.from({ length: 8 }, () => person());
    expect(readingConfidence({ frames: body, keyFrame: 4, armAngle: 30 })).toBe('low');
    // Side-on, under about 140° is not a readable release. Front-on foreshortens a straight arm.
    expect(readingConfidence({ frames: body, keyFrame: 4, armAngle: 133 })).toBe('low');
    expect(readingConfidence({ frames: body, keyFrame: 4, armAngle: 133, view: 'front' })).not.toBe('low');
    expect(readingConfidence({ frames: body, keyFrame: 4, armAngle: 150 })).toBe('medium');
    expect(readingConfidence({ frames: body, keyFrame: 4, armAngle: 170, times: body.map((_, i) => i / 10) })).not.toBe('high');
  });

  it('asks for a normal-speed clip when the pictures are sparse', () => {
    const frames = Array.from({ length: 12 }, (_, i) => person({
      rWrist: [114, i === 8 ? 15 : 170],
      rElbow: [112, i === 8 ? 40 : 120],
    }));
    const times = frames.map((_, i) => i / 10);
    const marked = analyseDetailed(frames, 'bowling', 'right', W, H, undefined, 'side', times);
    expect(marked.ok).toBe(true);
    if (!marked.ok) return;
    expect(marked.analysis.warnings).toContain(LOW_FPS_MESSAGE);
    expect(marked.analysis.confidence === 'low' || marked.analysis.confidence === 'medium').toBe(true);
  });

  it('gives a pull its own weight tip and lets a drive elbow reach 175°', () => {
    expect(metricDefFor('weightTransfer', 'batting', 'side', 'pull')?.tip ?? '').toMatch(/back foot/i);
    expect(metricDefFor('frontElbow', 'batting', 'side', 'drive')?.ideal[1]).toBeGreaterThanOrEqual(175);
    const knee = metricDefFor('kneeFlex', 'batting', 'side', 'drive');
    expect(knee?.ideal[0]).toBeLessThanOrEqual(110);
    expect(scoreFor(129, knee?.ideal ?? [110, 170], knee?.tolerance ?? 30)).toBeGreaterThanOrEqual(85);
    expect(scoreFor(168, [90, 175], 40)).toBeGreaterThanOrEqual(85);
    expect(scoreFor(157, [55, 175], 35)).toBeGreaterThanOrEqual(85);
  });

  it('keeps the vertical peak just after the front foot lands, not the follow-through', () => {
    const frames: Landmark[][] = [];
    const times: number[] = [];
    for (let i = 0; i < 90; i++) {
      const t = i / 25;
      times.push(t);
      const stride = t >= 1.9 && t <= 2.35;
      const release = Math.abs(t - 2.02) < 0.03;
      const follow = Math.abs(t - 3.16) < 0.03;
      frames.push(person({
        lAnkle: [stride ? 30 : 90, 346],
        rAnkle: [stride ? 175 : 110, 340],
        rWrist: [release ? 112 : follow ? 30 : 114, release ? 18 : follow ? 6 : 175],
        rElbow: [release ? 112 : 70, release ? 48 : 40],
      }));
    }
    const picked = findRelease(frames, 'right', W, H, times);
    expect(picked).not.toBeNull();
    expect(times[picked?.frame ?? 0]).toBeGreaterThan(1.9);
    expect(times[picked?.frame ?? 0]).toBeLessThan(2.4);
  });

  it('uses the highest hand in the stride when the arm looks short, at medium confidence', () => {
    const frames: Landmark[][] = [];
    const times: number[] = [];
    for (let i = 0; i < 30; i++) {
      const t = i / 10;
      times.push(t);
      const bowl = Math.abs(t - 2.1) < 0.05;
      frames.push(person(bowl ? {
        rWrist: [118, 72], rElbow: [150, 90], lAnkle: [35, 346], rAnkle: [175, 340],
      } : {}));
    }
    const picked = findRelease(frames, 'right', W, H, times);
    expect(picked?.confidence).toBe('medium');
    expect(times[picked?.frame ?? 0]).toBeGreaterThan(1.5);
  });

  it('takes the earliest frame that is already at the peak hand speed', () => {
    const frames = Array.from({ length: 20 }, () => person({ rWrist: [114, 160] }));
    for (let i = 6; i <= 10; i++) frames[i] = person({ rWrist: [114, 160 - (i - 5) * 18] });
    frames[11] = person({ rWrist: [114, 70] });
    frames[12] = person({ rWrist: [160, 100] });
    frames[13] = person({ rWrist: [200, 140] });
    frames[14] = person({ rWrist: [202, 146] });
    for (let i = 15; i < 20; i++) frames[i] = person({ rWrist: [204, 150] });
    expect(findContactFrame(frames, 'right', W, H)).toBe(12);
  });

  it('hides a broadcast picture and a folded arm from either side', () => {
    const body = Array.from({ length: 8 }, () => person());
    expect(readingConfidence({ frames: body, keyFrame: 4, motion: 'pan' })).toBe('low');
    expect(readingConfidence({ frames: body, keyFrame: 4, motion: 'zoom' })).toBe('low');
    const far = body.map((lm) => lm.map((point) => ({ ...point, y: 0.45 + (point.y - 0.5) * 0.2 })));
    expect(readingConfidence({ frames: far, keyFrame: 4 })).toBe('low');
    const world = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }));
    world[L.rShoulder] = { x: 0, y: 1, z: 0 };
    world[L.rElbow] = { x: 0, y: 0, z: 0 };
    world[L.rWrist] = { x: 1, y: 0, z: 0 };
    expect(elbowAngle3D(world, 'right')).toBeCloseTo(90, 0);
    expect(upscaleFactor(128)).toBe(2);
    expect(upscaleFactor(400)).toBe(1);
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
