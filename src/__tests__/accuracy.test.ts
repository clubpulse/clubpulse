import { L, type Landmark } from '@/lib/analysis/pose-metrics';
import { framingPrompt } from '@/lib/analysis/framing';
import { consistentArmAngle } from '@/lib/analysis/arm-check';
import { estimateBoneLengths, repairBoneLengths, type LengthPoint } from '@/lib/analysis/bone-length';
import { UNMEASURED_MESSAGE, heavyFrameIndexes, judgeMetric, preferLiteModel } from '@/lib/analysis/metric-confidence';
import { pickHighlights } from '@/lib/analysis/pose-overlay';
import type { MetricResult } from '@/lib/analysis/pose-metrics';

function body(over: Partial<Record<number, { x: number; y: number; visibility?: number }>>): Landmark[] {
  const points: Landmark[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
  for (const [index, point] of Object.entries(over)) {
    if (!point) continue;
    points[Number(index)] = { x: point.x ?? 0.5, y: point.y ?? 0.5, visibility: point.visibility ?? 1 };
  }
  return points;
}

/** A player who fills the frame. Shoulders can be side-on (narrow) or front-on (wide). */
function posed(front: boolean): Landmark[] {
  const shoulder = front ? 0.28 : 0.01;
  return body({
    [L.nose]: { x: 0.5, y: 0.12 },
    [L.lShoulder]: { x: 0.5 - shoulder, y: 0.28 },
    [L.rShoulder]: { x: 0.5 + shoulder, y: 0.28 },
    [L.lHip]: { x: 0.48, y: 0.55 },
    [L.rHip]: { x: 0.52, y: 0.55 },
    [L.lAnkle]: { x: 0.46, y: 0.9 },
    [L.rAnkle]: { x: 0.54, y: 0.9 },
  });
}

describe('live framing', () => {
  it('asks for the whole body, then a closer shot, then the matching camera angle', () => {
    const cutOff = posed(false);
    cutOff[L.lAnkle] = { x: 0.46, y: 0.9, visibility: 0 };
    expect(framingPrompt(cutOff, 'side')).toBe('Move so your whole body is in view');

    const far = posed(false);
    for (const point of far) point.y = 0.45 + (point.y - 0.5) * 0.25;
    expect(framingPrompt(far, 'side')).toBe('Step closer');

    expect(framingPrompt(posed(true), 'side')).toBe('Turn the phone sideways');
    expect(framingPrompt(posed(false), 'front')).toBe('Face the camera');
    expect(framingPrompt(posed(false), 'side')).toBeNull();
    expect(framingPrompt(posed(true), 'front')).toBeNull();
  });
});

describe('per-number confidence', () => {
  it('hides a number when the joints are faint, jump, or disagree', () => {
    expect(judgeMetric({ visibility: [0.9, 0.95], jumps: [0.05], spread: 4, spreadLimit: 40 })).toBe('high');
    expect(judgeMetric({ visibility: [0.6], jumps: [0.1], spread: 4, spreadLimit: 40 })).toBe('medium');
    expect(judgeMetric({ visibility: [0.3, 0.4], jumps: [0.05], spread: 4, spreadLimit: 40 })).toBe('low');
    expect(judgeMetric({ visibility: [0.9], jumps: [0.7], spread: 4, spreadLimit: 40 })).toBe('low');
    expect(judgeMetric({ visibility: [0.9], jumps: [0.05], spread: 80, spreadLimit: 40 })).toBe('low');
    expect(UNMEASURED_MESSAGE).toContain('filming closer');
  });

  it('does not draw a low-confidence measure on the skeleton', () => {
    const metric = (key: string, confidence?: 'high' | 'medium' | 'low'): MetricResult => ({
      key, value: 170, score: 90, unit: '°', label: key, ideal: [150, 180], tolerance: 20, tip: '', confidence,
    });
    const marks = pickHighlights([
      metric('armStraightness', 'low'),
      metric('frontKnee', 'high'),
    ], 'bowling', 'right', 'side');
    expect(marks.map((mark) => mark.key)).toEqual(['frontKnee']);
  });
});

describe('heavy model window', () => {
  it('asks for a few frames around the key moment and skips the heavy model on a small phone', () => {
    expect(heavyFrameIndexes(10, 100, 3)).toEqual([7, 8, 9, 10, 11, 12, 13]);
    expect(heavyFrameIndexes(1, 5, 3)).toEqual([0, 1, 2, 3, 4]);
    expect(heavyFrameIndexes(0, 0)).toEqual([]);
    expect(preferLiteModel({ cores: 8, memory: 8 })).toBe(false);
    expect(preferLiteModel({ cores: 2, memory: 8 })).toBe(true);
    expect(preferLiteModel({ cores: 8, memory: 2 })).toBe(true);
    expect(preferLiteModel({ cores: 8, memory: 8, saveData: true })).toBe(true);
  });
});

describe('bowling arm check', () => {
  it('drops a collapsed 45° frame and keeps the straight arm', () => {
    const straight = { angle: 168, upper: 40, fore: 36 };
    const miss = { angle: 45, upper: 40, fore: 8 };
    const reading = consistentArmAngle([straight, straight, miss, { ...straight, angle: 172 }]);
    expect(reading.angle).toBeGreaterThan(160);
    expect(reading.unreliable).toBe(false);
  });

  it('flags the arm when most frames disagree', () => {
    const reading = consistentArmAngle([
      { angle: 170, upper: 40, fore: 36 },
      { angle: 40, upper: 10, fore: 40 },
      { angle: 90, upper: 80, fore: 10 },
      { angle: 120, upper: 20, fore: 70 },
    ]);
    expect(reading.unreliable).toBe(true);
  });
});

describe('bone lengths', () => {
  function limb(elbowY: number): LengthPoint[] {
    const points: LengthPoint[] = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 1 }));
    points[L.lShoulder] = { x: 0.5, y: 0.2, visibility: 1 };
    points[L.lElbow] = { x: 0.5, y: elbowY, visibility: 1 };
    return points;
  }

  it('learns a length from a T-pose and pulls a stretched frame back', () => {
    const calm = [limb(0.4), limb(0.4), limb(0.4), limb(0.4)];
    const lengths = estimateBoneLengths(calm, 100, 100);
    expect(lengths['11-13']).toBeCloseTo(20, 5);

    const stretched = [...calm, limb(0.9)];
    const repaired = repairBoneLengths(stretched, 100, 100, lengths);
    expect(repaired[0][L.lElbow].y).toBeCloseTo(0.4, 5);
    expect(repaired[4][L.lElbow].y).toBeCloseTo(0.4, 5);
  });

  it('leaves a limb that stays short, such as an arm pointing at the camera', () => {
    const frames = [limb(0.7), limb(0.7), limb(0.7), limb(0.4), limb(0.4), limb(0.4)];
    const repaired = repairBoneLengths(frames, 100, 100);
    expect(repaired[0][L.lElbow].y).toBeCloseTo(0.7, 5);
    expect(repaired[5][L.lElbow].y).toBeCloseTo(0.4, 5);
  });

  it('uses the middle of the clip when there is no T-pose', () => {
    const frames = [limb(0.4), limb(0.4), limb(0.4), limb(0.9)];
    const repaired = repairBoneLengths(frames, 100, 100);
    expect(repaired[3][L.lElbow].y).toBeCloseTo(0.4, 5);
    expect(repaired[0][L.lElbow].y).toBeCloseTo(0.4, 5);
  });
});
