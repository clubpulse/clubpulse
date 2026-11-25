import { GUIDE_CARDS, GUIDE_SEEN_KEY, guideCardFor, guideIndex, guideKey } from '@/lib/analysis/film-guide';
import { LOW_FPS_MESSAGE } from '@/lib/analysis/pose-metrics';

describe('filming guide', () => {
  it('has three short cards and no photos', () => {
    expect(GUIDE_CARDS.map((card) => card.id)).toEqual(['angle', 'distance', 'steady']);
    const text = GUIDE_CARDS.flatMap((card) => [card.title, card.alt, ...card.lines]).join('\n');
    expect(text).toMatch(/side-on/i);
    expect(text).toMatch(/chest height/i);
    expect(text).toMatch(/level/i);
    expect(text).toMatch(/front-on only if/i);
    expect(text).toMatch(/8–12 m/);
    expect(text).toMatch(/4–6 m/);
    expect(text).toMatch(/one person/i);
    expect(text).toMatch(/tripod/i);
    expect(text).toMatch(/do not pan or zoom/i);
    expect(text).toMatch(/30 fps/i);
    expect(text).toMatch(/slow motion/i);
    expect(text).toMatch(/light behind the camera/i);
    expect(text).toMatch(/last few strides/i);
    expect(text).toMatch(/stance, the shot, and the finish/i);
    expect(text).toMatch(/not TV or a broadcast/i);
    expect(text).not.toMatch(/https?:\/\//);
    expect(GUIDE_SEEN_KEY).toBe('shiftup.analyse.guide');
    for (const card of GUIDE_CARDS) expect(card.alt.length).toBeGreaterThan(10);
  });

  it('opens the card that matches the problem', () => {
    expect(guideCardFor(['feet out of frame'])).toBe('distance');
    expect(guideCardFor(['more than one person'])).toBe('distance');
    expect(guideCardFor([LOW_FPS_MESSAGE])).toBe('steady');
    expect(guideCardFor(['The phone moved. No pan or zoom.'])).toBe('steady');
    expect(guideCardFor(['This looks side-on. Switch?'])).toBe('angle');
    expect(guideCardFor(['This looks front-on. Switch?'])).toBe('angle');
    expect(guideCardFor(['feet out of frame', LOW_FPS_MESSAGE])).toBe('distance');
    expect(guideCardFor([])).toBeNull();
    expect(guideIndex('steady')).toBe(2);
  });

  it('closes on Esc and traps Tab at the ends', () => {
    expect(guideKey('Escape', false, false, false)).toBe('close');
    expect(guideKey('Tab', false, false, true)).toBe('focus-first');
    expect(guideKey('Tab', true, true, false)).toBe('focus-last');
    expect(guideKey('Tab', false, false, false)).toBeNull();
  });
});
