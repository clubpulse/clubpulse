import { compareAnalyses, sameKind, type SavedAnalysis } from '@/lib/analysis/compare';
import type { MetricResult } from '@/lib/analysis/pose-metrics';

const metric = (key: string, value: number, score: number, extra: Partial<MetricResult> = {}): MetricResult =>
  ({ key, label: key, unit: '°', ideal: [150, 170], tolerance: 40, tip: 'Brace the front leg.', value, score, ...extra });
const saved = (overall: number, metrics: Array<[string, number, number]>, extra: Partial<SavedAnalysis> = {}): SavedAnalysis =>
  ({ mode: 'bowling', view: 'side', overall, metrics: metrics.map(([key, value, score]) => ({ key, label: key, value, score })), createdAt: '2026-11-10T10:00:00Z', ...extra });

describe('sameKind', () => {
  it('needs the same discipline and view, and the same shot for batting', () => {
    expect(sameKind({ mode: 'bowling', view: 'side' }, { mode: 'bowling' })).toBe(true);
    expect(sameKind({ mode: 'bowling', view: 'side' }, { mode: 'bowling', view: 'front' })).toBe(false);
    expect(sameKind({ mode: 'batting', shotType: 'drive' }, { mode: 'batting', shotType: 'pull' })).toBe(false);
    expect(sameKind({ mode: 'batting', shotType: 'drive' }, { mode: 'batting', shotType: 'drive' })).toBe(true);
    expect(sameKind({ mode: 'batting', shotType: 'drive' }, { mode: 'bowling' })).toBe(false);
  });
});

describe('compareAnalyses', () => {
  const now = { overall: 80, metrics: [metric('knee', 158, 92), metric('arm', 120, 55), metric('head', 160, 90)] };
  const before = saved(72, [['knee', 139, 70], ['arm', 140, 75], ['head', 161, 91]]);
  const c = compareAnalyses(now, before);

  it('sorts each measure into better, worse or the same', () => {
    expect(c.better.map((x) => x.key)).toEqual(['knee']);
    expect(c.worse.map((x) => x.key)).toEqual(['arm']);
    expect(c.same.map((x) => x.key)).toEqual(['head']);
  });
  it('explains an improvement with both numbers and the target', () => {
    expect(c.better[0].text).toBe('158° now, 139° last time. It is now inside the target (150° to 170°).');
  });
  it('explains a slip politely and gives the tip', () => {
    expect(c.worse[0].text).toBe('120° now, 140° last time. Further from the target (150° to 170°). Brace the front leg.');
  });
  it('says when something held steady inside the target', () => {
    expect(c.same[0].text).toBe('Steady at 160°, inside the target (150° to 170°).');
  });
  it('gives the overall change', () => {
    expect(c.headline).toBe('Overall 80, up 8 from 72 last time.');
    expect(c.overall).toBe('better');
    expect(c.when).toBe('2026-11-10T10:00:00Z');
  });
  it('treats a small move as no change', () => {
    const tiny = compareAnalyses({ overall: 74, metrics: [metric('knee', 141, 72)] }, saved(72, [['knee', 139, 70]]));
    expect(tiny.overall).toBe('same');
    expect(tiny.same).toHaveLength(1);
    expect(tiny.headline).toBe('Overall 74, about the same as last time (72).');
  });
  it('is kind about a lower mark', () => {
    expect(compareAnalyses({ overall: 60, metrics: [] }, saved(72, [])).headline).toBe('Overall 60, down 12 from 72 last time. One session is not a trend.');
  });
  it('leaves out measures that are excused or were not measured before', () => {
    const r = compareAnalyses({ overall: 80, metrics: [metric('knee', 158, 92, { excused: true }), metric('new', 160, 90)] }, saved(72, [['knee', 139, 70]]));
    expect([...r.better, ...r.worse, ...r.same]).toHaveLength(0);
  });
  it('puts the biggest change first', () => {
    const r = compareAnalyses({ overall: 90, metrics: [metric('a', 155, 80), metric('b', 160, 95)] }, saved(60, [['a', 150, 70], ['b', 120, 40]]));
    expect(r.better.map((x) => x.key)).toEqual(['b', 'a']);
  });
});
