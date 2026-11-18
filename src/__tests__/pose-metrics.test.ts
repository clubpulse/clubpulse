import { L, analyseDetailed, bowlingAnalysis, metricJoints, playerSize, segmentScore, type Landmark } from '@/lib/analysis/pose-metrics';

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
    expect(byKey.frontKnee.score).toBe(100);
    expect(byKey.armStraightness.value).toBeGreaterThan(165);
    expect(byKey.armUpright.value).toBeLessThan(5);
    expect(byKey.armUpright.score).toBe(100);
    expect(byKey.headStability.score).toBe(100);
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
    expect(outcome.analysis.metrics).toHaveLength(10);
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
