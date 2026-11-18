import { chances } from '@/lib/scratch/logic';

describe('chances', () => {
  it('turns weights into whole percentages that add up to 100', () => {
    const out = chances([{ label: '50 Scores', weight: 1 }, { label: '100 Scores', weight: 1 }, { label: '£5 gift card', weight: 1 }]);
    expect(out.reduce((a, r) => a + r.chance, 0)).toBe(100);
    expect(out.map((r) => r.chance).sort()).toEqual([33, 33, 34]);
  });

  it('lists the most likely prize first', () => {
    expect(chances([{ label: 'Rare', weight: 1 }, { label: 'Common', weight: 9 }])).toEqual([
      { label: 'Common', chance: 90 },
      { label: 'Rare', chance: 10 },
    ]);
  });

  it('merges prizes with the same label and names an empty card plainly', () => {
    expect(chances([
      { label: '50 Scores', weight: 2 },
      { label: '50 Scores', weight: 2 },
      { label: 'Unlucky', weight: 4, prize_type: 'try_again' },
    ])).toEqual([
      { label: '50 Scores', chance: 50 },
      { label: 'No prize this time', chance: 50 },
    ]);
  });

  it('ignores bad weights and copes with an empty pool', () => {
    expect(chances([])).toEqual([]);
    expect(chances([{ label: 'x', weight: 0 }, { label: 'y', weight: -3 }])).toEqual([]);
  });
});
