import type { MetricResult } from '@/lib/analysis/pose-metrics';
import { coachingChains, scoreMeaning, topFix } from '@/lib/analysis/coaching-causes';

function metric(key: string, value: number, score: number, confidence: 'high' | 'medium' | 'low' = 'high'): MetricResult {
  return {
    key, value, score, confidence, unit: '°', label: key, ideal: [0, 180], tolerance: 20, tip: `Drill for ${key}`,
  };
}

describe('what the score means', () => {
  it('says 7/10 in one line and points at the player’s own past scores', () => {
    expect(scoreMeaning(70)).toBe('7/10: mostly there, one thing to fix. Compare with your own past scores, not others');
    expect(scoreMeaning(92)).toContain('9/10');
    expect(scoreMeaning(40)).toContain('4/10');
  });
});

describe('likely cause', () => {
  it('blames the stride when the front knee folds and the front foot lands across', () => {
    const chains = coachingChains([
      metric('frontKnee', 110, 40),
      metric('frontFootLine', 0.55, 50, 'high'),
      metric('armStraightness', 170, 96),
    ]);
    expect(chains.map((chain) => chain.key)).toEqual(['frontKnee', 'frontFootLine']);
    const knee = chains.find((chain) => chain.key === 'frontKnee');
    expect(knee?.problem).toBe('Front knee is folding at release');
    expect(knee?.likelyCause).toMatch(/may be landing across/);
    expect(knee?.likelyCause.toLowerCase()).not.toMatch(/definitely|certainly|always/);
    expect(knee?.fix).toMatch(/front foot/);
  });

  it('blames shoulder alignment when the arm bends and the arm is already tipping', () => {
    const [arm] = coachingChains([
      metric('armStraightness', 120, 35),
      metric('armUpright', 40, 55),
    ]);
    expect(arm.key).toBe('armStraightness');
    expect(arm.likelyCause).toMatch(/shoulders may be tipping/);
    expect(arm.fix).toMatch(/ear/);
  });

  it('ignores a related reading that did not pass confidence', () => {
    const [arm] = coachingChains([
      metric('armStraightness', 120, 35),
      metric('armUpright', 40, 55, 'low'),
    ]);
    expect(arm.likelyCause).toMatch(/elbow may be bending/);
  });

  it('leaves a low-confidence metric out, and puts the weakest clear fix first', () => {
    const metrics = [
      metric('frontKnee', 110, 70),
      metric('armStraightness', 120, 30),
      metric('headStability', 0.4, 20, 'low'),
    ];
    expect(coachingChains(metrics).map((chain) => chain.key)).toEqual(['armStraightness', 'frontKnee']);
    expect(topFix(metrics)?.key).toBe('armStraightness');
    expect(topFix(metrics)?.fix.length).toBeGreaterThan(0);
  });
});
