import { analyse, type Mode, type ShotType } from '@/lib/analysis/pose-metrics';
import { REFERENCE_SIZE, getReference, referenceBat, referencePose } from '@/lib/analysis/reference';

const CASES: [Mode, ShotType | undefined][] = [
  ['bowling', undefined], ['batting', 'drive'], ['batting', 'defence'], ['batting', 'leave'],
  ['batting', 'pull'], ['batting', 'cut'], ['batting', 'sweep'],
];

describe('textbook reference positions', () => {
  // The model has to agree with the scoring: if the textbook position scored badly, either the
  // drawing or the target range would be wrong, and the comparison shown to players would mislead.
  it.each(CASES)('%s %s scores well on every measure, for both hands', (mode, shot) => {
    const reference = getReference(mode, shot);
    const scores = (['right', 'left'] as const).map((hand) => {
      const frames = Array.from({ length: 12 }, () => referencePose(reference, hand));
      const metrics = analyse(frames, mode, hand, REFERENCE_SIZE, REFERENCE_SIZE, shot);
      expect(metrics).not.toBeNull();
      for (const metric of metrics!) expect({ key: metric.key, ok: metric.score >= 80 }).toEqual({ key: metric.key, ok: true });
      return metrics!.map((metric) => metric.score);
    });
    expect(scores[0]).toEqual(scores[1]);
  });

  it('has checkpoints for every position and a bat for every shot', () => {
    for (const [mode, shot] of CASES) {
      const reference = getReference(mode, shot);
      expect(reference.checkpoints.length).toBeGreaterThanOrEqual(4);
      expect(referenceBat(reference, 'right') !== null).toBe(mode === 'batting');
      for (const source of reference.sources) expect(source.url).toMatch(/^https:\/\//);
    }
  });

  it('mirrors for left-handers', () => {
    const reference = getReference('bowling');
    const right = referencePose(reference, 'right');
    const left = referencePose(reference, 'left');
    // The right-armer's bowling wrist is the left-armer's, on the other side of the picture
    expect(left[15].x).toBeCloseTo(1 - right[16].x, 5);
    expect(left[15].y).toBeCloseTo(right[16].y, 5);
    expect(referenceBat(getReference('batting', 'drive'), 'left')![0]).toBeCloseTo(1 - referenceBat(getReference('batting', 'drive'), 'right')![0], 5);
  });
});
