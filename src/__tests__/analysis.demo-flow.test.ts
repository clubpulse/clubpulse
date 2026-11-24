import { drillFor, weakestMeasure, wholeBodyVisible, type MetricResult } from '@/lib/analysis/pose-metrics';
import { L } from '@/lib/analysis/pose-metrics';

const metric = (key: string, score: number): MetricResult => ({
  key, label: key, unit: '°', ideal: [0, 10], tolerance: 10, tip: `Keep the ${key} steady.`, value: 1, score,
});

describe('demo analysis summary', () => {
  it('picks the lowest counted measure and writes one drill from its tip', () => {
    const weak = weakestMeasure([metric('head', 90), { ...metric('knee', 40), excused: true }, metric('elbow', 55)]);
    expect(weak?.key).toBe('elbow');
    expect(drillFor(weak!)).toContain('Keep the elbow steady.');
  });

  it('wants the head and both feet inside the picture', () => {
    const point = (y: number) => ({ x: 0.5, y, visibility: 0.9 });
    const body = Array.from({ length: 33 }, () => point(0.5));
    body[L.nose] = point(0.1);
    body[L.lAnkle] = point(0.9);
    body[L.rAnkle] = point(0.92);
    expect(wholeBodyVisible(body)).toBe(true);
    body[L.rAnkle] = { x: 0.5, y: 0.99, visibility: 0.2 };
    expect(wholeBodyVisible(body)).toBe(false);
  });
});
