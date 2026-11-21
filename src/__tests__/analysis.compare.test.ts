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

describe('trends', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { directionOf, trendOver, progressByKind, describeKind, rebuild } = require('@/lib/analysis/compare');

  it('reads which way a run of marks is heading', () => {
    expect(directionOf([62, 68, 72, 80])).toBe('improving');
    expect(directionOf([80, 74, 70, 61])).toBe('slipping');
    expect(directionOf([71, 72, 70, 72])).toBe('steady');
    expect(directionOf([60, 80, 58, 79, 61])).toBe('mixed');
  });
  it('needs three analyses before calling a trend', () => {
    const now = { overall: 80, metrics: [metric('knee', 158, 92)] };
    expect(trendOver(now, [saved(72, [['knee', 139, 70]])])).toBeNull();
    const t = trendOver(now, [saved(72, [['knee', 139, 70]]), saved(65, [['knee', 130, 58]])]);
    expect(t.marks).toEqual([65, 72, 80]);
    expect(t.direction).toBe('improving');
    expect(t.text).toBe('Your last 3: 65, 72, 80. You are improving.');
    expect(t.measures[0]).toMatchObject({ key: 'knee', direction: 'improving', marks: [58, 70, 92] });
  });
  it('lists what is slipping before what is improving, and leaves out what is steady', () => {
    const now = { overall: 70, metrics: [metric('a', 1, 90), metric('b', 1, 50), metric('c', 1, 71)] };
    const t = trendOver(now, [saved(70, [['a', 1, 80], ['b', 1, 65], ['c', 1, 70]]), saved(70, [['a', 1, 70], ['b', 1, 80], ['c', 1, 72]])]);
    expect(t.measures.map((m: { key: string }) => m.key)).toEqual(['b', 'a']);
    expect(t.measures[0].text).toBe('80, 65, 50. Slipping, so this is the one to work on.');
  });
  it('skips a measure that was not taken every time', () => {
    const t = trendOver({ overall: 80, metrics: [metric('knee', 1, 90)] }, [saved(70, [['knee', 1, 70]]), saved(60, [])]);
    expect(t.measures).toEqual([]);
  });
  it('names a kind of analysis', () => {
    expect(describeKind({ mode: 'bowling', view: 'front' })).toBe('Bowling · front-on');
    expect(describeKind({ mode: 'batting', shotType: 'drive' })).toMatch(/^Batting · .*rive · side-on$/);
  });
  it('puts a saved analysis back together with its targets', () => {
    const r = rebuild({ mode: 'bowling', view: 'side', overall: 70, metrics: [{ key: 'nope', label: 'x', value: 1, score: 1 }] });
    expect(r.metrics).toEqual([]);
  });
  it('groups saved analyses by kind, newest first', () => {
    const list = [
      saved(80, [], { createdAt: 'c' }), saved(72, [], { createdAt: 'b' }),
      saved(60, [], { mode: 'batting', shotType: 'drive', createdAt: 'd' }), saved(65, [], { createdAt: 'a' }),
    ];
    const p = progressByKind(list);
    expect(p.map((x: { kind: string }) => x.kind)[0]).toBe('Bowling · side-on');
    expect(p[0]).toMatchObject({ sessions: 3, overall: 80, when: 'c' });
    expect(p[0].comparison.headline).toBe('Overall 80, up 8 from 72 last time.');
    expect(p[0].trend.marks).toEqual([65, 72, 80]);
    expect(p[1]).toMatchObject({ sessions: 1, comparison: null, trend: null });
  });
});
