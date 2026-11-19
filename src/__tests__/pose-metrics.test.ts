import { ELBOW_EXTENSION_LIMIT, L, ON_TARGET, UNIQUE_ACTIONS, analyseDetailed, overallScore, scoreFor, bowlingAnalysis, metricJoints, playerSize, segmentScore, type Landmark } from '@/lib/analysis/pose-metrics';

const W = 1080;
const H = 1920;

type Joints = Partial<Record<keyof typeof L, [number, number]>>;

// A person standing side-on, in video pixels. Arms hang by the sides.
const STANDING: Record<keyof typeof L, [number, number]> = {
  nose: [540, 600],
  lShoulder: [520, 700], rShoulder: [560, 700],
  lElbow: [515, 850], rElbow: [565, 850],
  lWrist: [512, 990], rWrist: [568, 990],
  lHip: [525, 1050], rHip: [555, 1050],
  lKnee: [522, 1300], rKnee: [558, 1300],
  lAnkle: [520, 1550], rAnkle: [560, 1550],
};

function pose(overrides: Joints = {}, hidden: (keyof typeof L)[] = []): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  for (const [name, index] of Object.entries(L) as [keyof typeof L, number][]) {
    const [x, y] = overrides[name] ?? STANDING[name];
    lm[index] = { x: x / W, y: y / H, visibility: hidden.includes(name) ? 0.1 : 0.95 };
  }
  return lm;
}

// A right-arm bowler at release: bowling arm straight up, front (left) leg planted and straight
const RELEASE: Joints = {
  rElbow: [562, 550], rWrist: [565, 400],
  lKnee: [600, 1300], lAnkle: [680, 1545],
};

// Run-up (arms low), the arm coming over, release, follow-through
function delivery(release: Joints = RELEASE): Landmark[][] {
  const frames: Landmark[][] = [];
  for (let i = 0; i < 14; i++) frames.push(pose());
  frames.push(pose({ ...release, rElbow: [640, 640], rWrist: [730, 600] }));
  frames.push(pose({ ...release, rElbow: [610, 580], rWrist: [660, 460] }));
  frames.push(pose(release));
  frames.push(pose({ ...release, rElbow: [500, 620], rWrist: [450, 720] }));
  for (let i = 0; i < 4; i++) frames.push(pose({ rElbow: [500, 820], rWrist: [470, 950] }));
  return frames;
}

describe('bowlingAnalysis', () => {
  it('finds the release and measures a good action there', () => {
    const result = bowlingAnalysis(delivery(), 'right', W, H);
    expect(result).not.toBeNull();
    expect(result!.keyFrame).toBe(16);
    const byKey = Object.fromEntries(result!.metrics.map((m) => [m.key, m]));
    expect(byKey.frontKnee.value).toBeGreaterThan(165);
    expect(byKey.armStraightness.value).toBeGreaterThan(165);
    expect(byKey.armUpright.value).toBeLessThan(5);
    // Inside every range, so on target, but not every one is the textbook value
    for (const key of ['frontKnee', 'armStraightness', 'armUpright']) expect(byKey[key].score).toBeGreaterThanOrEqual(ON_TARGET);
    // Standing bolt upright is outside the forward lean range, and no longer scores full marks
    expect(byKey.trunkTilt.score).toBeLessThan(ON_TARGET);
    expect(result!.unique).toEqual([]);
  });

  it('marks down a bent front knee and a bent arm', () => {
    const bent: Joints = { rElbow: [640, 560], rWrist: [565, 400], lKnee: [680, 1250], lAnkle: [620, 1545] };
    const frames = delivery(bent);
    // The arm is bent all the way over, not only at release
    frames[14] = pose({ ...bent, rElbow: [700, 600], rWrist: [740, 660] });
    frames[15] = pose({ ...bent, rElbow: [690, 560], rWrist: [650, 470] });
    const result = bowlingAnalysis(frames, 'right', W, H);
    const byKey = Object.fromEntries(result!.metrics.map((m) => [m.key, m]));
    expect(byKey.frontKnee.value).toBeLessThan(150);
    expect(byKey.frontKnee.score).toBeLessThan(60);
    expect(byKey.armStraightness.score).toBeLessThan(60);
  });

  it('sees no action in someone standing still, or with the wrong arm chosen', () => {
    expect(bowlingAnalysis(Array.from({ length: 60 }, () => pose()), 'right', W, H)).toBeNull();
    expect(bowlingAnalysis(delivery(), 'left', W, H)).toBeNull();
  });

  it('still scores when the front leg is hidden, without that measure', () => {
    const frames = delivery().map((lm) => {
      const copy = lm.map((point) => ({ ...point }));
      copy[L.lKnee].visibility = 0.1;
      return copy;
    });
    const result = bowlingAnalysis(frames, 'right', W, H);
    expect(result).not.toBeNull();
    expect(result!.metrics.some((m) => m.key === 'frontKnee')).toBe(false);
    expect(result!.metrics.some((m) => m.key === 'armStraightness')).toBe(true);
  });
});

describe('bowling arm reference check', () => {
  it('reads close to zero for a straight arm', () => {
    const { elbow } = bowlingAnalysis(delivery(), 'right', W, H)!;
    expect(elbow.frames).toBe(3);
    expect(elbow.extension).not.toBeNull();
    expect(elbow.extension!).toBeLessThan(ELBOW_EXTENSION_LIMIT);
  });

  it('reads high when the arm comes over bent and straightens into release', () => {
    const frames = delivery();
    // Bent about 30 degrees at the elbow on the way up from horizontal; straight at release
    frames[15] = pose({ ...RELEASE, rElbow: [640, 600], rWrist: [660, 470] });
    const { elbow } = bowlingAnalysis(frames, 'right', W, H)!;
    expect(elbow.mostBent!).toBeLessThan(160);
    expect(elbow.atRelease!).toBeGreaterThan(170);
    expect(elbow.extension!).toBeGreaterThan(ELBOW_EXTENSION_LIMIT);
    expect(['extension', 'both']).toContain(elbow.kind);
  });

  it('does not count an elbow that goes past straight as straightening', () => {
    const frames = delivery();
    // Slightly bent one way on the way up, then bent the other way (hyperextended) at release
    frames[15] = pose({ ...RELEASE, rElbow: [640, 600], rWrist: [650, 468] });
    const release = frames[16].map((point) => ({ ...point }));
    const s = release[L.rShoulder], e = release[L.rElbow];
    // Put the wrist 12 degrees off the line of the upper arm, on the opposite side to frame 15
    const along = Math.atan2((e.y - s.y) * H, (e.x - s.x) * W);
    const side15 = Math.sign((frames[15][L.rElbow].x - frames[15][L.rShoulder].x) * W * (frames[15][L.rWrist].y - frames[15][L.rElbow].y) * H
      - (frames[15][L.rElbow].y - frames[15][L.rShoulder].y) * H * (frames[15][L.rWrist].x - frames[15][L.rElbow].x) * W);
    const turn = along - side15 * (12 * Math.PI) / 180;
    release[L.rWrist] = { ...release[L.rWrist], x: e.x + (130 * Math.cos(turn)) / W, y: e.y + (130 * Math.sin(turn)) / H };
    frames[16] = release;
    const { elbow } = bowlingAnalysis(frames, 'right', W, H)!;
    expect(elbow.hyperextension!).toBeGreaterThan(8);
    expect(['hyperextension', 'both']).toContain(elbow.kind);
    expect(elbow.atRelease!).toBe(180);
    // Only the movement from bent to straight is counted, not the part past straight
    expect(elbow.extension!).toBeCloseTo(180 - elbow.mostBent!, 5);
  });

  it('reads zero for an arm that is straight all the way up from horizontal', () => {
    const frames = delivery();
    frames[14] = pose({ ...RELEASE, rElbow: [640, 640], rWrist: [720, 580] });
    const { elbow } = bowlingAnalysis(frames, 'right', W, H)!;
    expect(elbow.extension!).toBeLessThan(3);
    expect(elbow.kind).toBe('none');
  });

  it('gives no figure when the reading is more than any real arm could do', () => {
    const frames = delivery();
    frames[15] = pose({ ...RELEASE, rElbow: [640, 600], rWrist: [560, 480] });
    const { elbow } = bowlingAnalysis(frames, 'right', W, H)!;
    expect(elbow.extension).toBeNull();
    expect(elbow.kind).toBeNull();
  });

  it('ignores a frame where the pose model lost the arm', () => {
    const frames = delivery();
    // The wrist jumps back next to the shoulder for one frame: the arm looks folded in half
    const glitch = frames[15].map((point) => ({ ...point }));
    glitch[L.rWrist] = { ...glitch[L.rWrist], x: glitch[L.rShoulder].x + 0.01, y: glitch[L.rShoulder].y - 0.01 };
    frames[15] = glitch;
    const { elbow } = bowlingAnalysis(frames, 'right', W, H)!;
    // Either no reading or a small one, never a three-figure "extension"
    expect(elbow.extension ?? 0).toBeLessThan(ELBOW_EXTENSION_LIMIT);
  });

  it('gives no reading when that part of the action was not seen', () => {
    const frames = delivery();
    for (const i of [14, 15]) frames[i] = frames[i].map((point, j) => (j === L.rElbow ? { ...point, visibility: 0.1 } : point));
    const { elbow } = bowlingAnalysis(frames, 'right', W, H)!;
    expect(elbow.extension).toBeNull();
    expect(elbow.kind).toBeNull();
    expect(elbow.frames).toBe(1);
  });

  it('is not part of the technique score', () => {
    expect(bowlingAnalysis(delivery(), 'right', W, H)!.metrics.some((m) => /elbow/i.test(m.key))).toBe(false);
  });
});

describe('analyseDetailed', () => {
  it('explains why it cannot score', () => {
    expect(analyseDetailed([], 'bowling', 'right', W, H)).toEqual({ ok: false, problem: 'no-body' });
    expect(analyseDetailed(Array.from({ length: 60 }, () => pose()), 'bowling', 'right', W, H)).toEqual({ ok: false, problem: 'no-action' });
  });

  it('returns the release position for bowling', () => {
    const outcome = analyseDetailed(delivery(), 'bowling', 'right', W, H);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.analysis.keyLabel).toBe('At release');
    expect(outcome.analysis.keyFrame).toBe(16);
    expect(outcome.analysis.framesSeen).toBe(22);
    // Wrist at 400 down to ankles at 1550, of 1920
    expect(outcome.analysis.playerSize).toBeCloseTo(0.6, 1);
  });

  it('scores batting and picks the top of the backswing', () => {
    const frames = Array.from({ length: 20 }, (_, i) => pose({ rWrist: [600, 990 - (i === 7 ? 400 : i * 5)] }));
    const outcome = analyseDetailed(frames, 'batting', 'right', W, H, 'drive');
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.analysis.keyFrame).toBe(7);
    expect(outcome.analysis.metrics).toHaveLength(8);
  });
});

describe('helpers', () => {
  it('measures how much of the picture the player fills', () => {
    expect(playerSize(pose())).toBeCloseTo((1550 - 600) / H, 2);
    expect(playerSize(Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 })))).toBe(0);
  });

  it('gives a highlight clip with no delivery in it a score of zero', () => {
    expect(segmentScore(Array.from({ length: 60 }, () => pose()), 60, 'bowling', 'right', W, H)).toBe(0);
    expect(segmentScore(delivery(), 22, 'bowling', 'right', W, H)).toBeGreaterThan(80);
  });

  it('knows which joints each measure is taken at', () => {
    expect(metricJoints('frontKnee', 'bowling', 'right')).toEqual([[L.lHip, L.lKnee, L.lAnkle]]);
    expect(metricJoints('armStraightness', 'bowling', 'left')).toEqual([[L.lShoulder, L.lElbow, L.lWrist]]);
    expect(metricJoints('headStability', 'bowling', 'right')).toEqual([]);
  });
});

describe('strict scoring', () => {
  it('gives 100 only for the best value', () => {
    expect(scoreFor(176, [165, 180], 30, 176)).toBe(100);
    expect(scoreFor(175, [165, 180], 30, 176)).toBeLessThan(100);
    expect(scoreFor(180, [165, 180], 30, 176)).toBe(85);
    expect(scoreFor(165, [165, 180], 30, 176)).toBe(85);
  });

  it('falls from 100 to 85 across the range, then to 0 across the tolerance', () => {
    const scores = [176, 172, 168, 165, 160, 150, 135, 120].map((value) => scoreFor(value, [165, 180], 30, 176));
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThan(scores[i - 1] + (scores[i - 1] === 0 ? 1 : 0));
    expect(scores[scores.length - 2]).toBe(0);
    expect(scoreFor(150, [165, 180], 30, 176)).toBe(43);
  });

  it('takes 0 as best for a range that starts at 0, and the middle otherwise', () => {
    expect(scoreFor(0, [0, 10], 20)).toBe(100);
    expect(scoreFor(5, [0, 10], 20)).toBe(93);
    expect(scoreFor(15, [5, 25], 20)).toBe(100);
    // A best value outside an overridden range is ignored
    expect(scoreFor(15, [5, 25], 20, 90)).toBe(100);
  });
});

describe('unique actions', () => {
  it('names a bent front knee, shows it and leaves it out of the overall score', () => {
    const frames = delivery({ rElbow: [562, 550], rWrist: [565, 400], lKnee: [690, 1260], lAnkle: [640, 1545] });
    const result = bowlingAnalysis(frames, 'right', W, H)!;
    expect(result.unique).toEqual(['bent-front-knee']);
    const knee = result.metrics.find((m) => m.key === 'frontKnee')!;
    expect(knee.value).toBeLessThan(145);
    expect(knee.excused).toBe(true);
    const counted = result.metrics.filter((m) => !m.excused);
    expect(overallScore(result.metrics)).toBe(Math.round(counted.reduce((sum, m) => sum + m.score, 0) / counted.length));
    expect(overallScore(result.metrics)).toBeGreaterThan(knee.score);
  });

  it('notices bowling off the wrong foot and measures the leg that lands', () => {
    // The bowling-side (right) foot is down and straight; the left leg is lifted
    const frames = delivery({ rElbow: [562, 550], rWrist: [565, 400], rKnee: [600, 1300], rAnkle: [680, 1545], lKnee: [480, 1250], lAnkle: [420, 1380] });
    const result = bowlingAnalysis(frames, 'right', W, H)!;
    expect(result.unique).toContain('wrong-footed');
    expect(result.metrics.find((m) => m.key === 'frontKnee')!.value).toBeGreaterThan(165);
  });

  it('names a round-arm action from front-on, and does not excuse a big side bend', () => {
    const roundArm = (extra: Joints = {}) => Array.from({ length: 14 }, () => pose({ rElbow: [667, 602], rWrist: [775, 505], lKnee: [522, 1300], ...extra }));
    const slinger = bowlingAnalysis(roundArm(), 'right', W, H, 'front')!;
    expect(slinger.unique).toEqual(['round-arm']);
    expect(slinger.metrics.find((m) => m.key === 'armHeight')!.excused).toBe(true);
    expect(UNIQUE_ACTIONS['round-arm'].excused).toBe(true);

    // Shoulders carried far to one side of the hips
    const bent = bowlingAnalysis(roundArm({ lShoulder: [820, 780], rShoulder: [860, 780], nose: [900, 700], rElbow: [900, 660], rWrist: [930, 540] }), 'right', W, H, 'front')!;
    expect(bent.unique).toContain('big-side-bend');
    expect(bent.metrics.find((m) => m.key === 'sideBend')!.excused).toBeUndefined();
    expect(UNIQUE_ACTIONS['big-side-bend'].excused).toBe(false);
  });

  it('finds nothing unique in an orthodox action', () => {
    expect(bowlingAnalysis(delivery(), 'right', W, H)!.unique).toEqual([]);
    const outcome = analyseDetailed(delivery(), 'bowling', 'right', W, H);
    expect(outcome.ok && outcome.analysis.unique).toEqual([]);
  });
});

describe('front-on view', () => {
  it('uses its own measures for bowling', () => {
    const outcome = analyseDetailed(delivery(), 'bowling', 'right', W, H, undefined, 'front');
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    const keys = outcome.analysis.metrics.map((m) => m.key);
    expect(keys).toEqual(expect.arrayContaining(['armHeight', 'sideBend', 'frontFootLine', 'frontArm']));
    expect(keys).not.toContain('frontKnee');
  });

  it('uses its own measures for batting, and skips the bat for a leave', () => {
    const frames = Array.from({ length: 20 }, () => pose());
    const drive = analyseDetailed(frames, 'batting', 'right', W, H, 'drive', 'front');
    expect(drive.ok).toBe(true);
    if (!drive.ok) return;
    expect(drive.analysis.metrics.map((m) => m.key)).toEqual(expect.arrayContaining(['headOverFront', 'batSwingPlane', 'shoulderLevel', 'balance', 'headStability']));
    const leave = analyseDetailed(frames, 'batting', 'right', W, H, 'leave', 'front');
    expect(leave.ok && leave.analysis.metrics.some((m) => m.key === 'batSwingPlane')).toBe(false);
  });
});
