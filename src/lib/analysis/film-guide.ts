import { LOW_FPS_MESSAGE } from './pose-metrics';

/** Which card of the filming guide to open. */
export type GuideCardId = 'angle' | 'distance' | 'steady';

export const GUIDE_SEEN_KEY = 'shiftup.analyse.guide';

export type GuideCard = {
  id: GuideCardId;
  title: string;
  /** Short lines, in order. UK English. */
  lines: string[];
  /** Alt text for the drawing on this card. */
  alt: string;
};

export const GUIDE_CARDS: GuideCard[] = [
  {
    id: 'angle',
    title: 'Angle',
    alt: 'A phone at chest height, level, filming a player from the side.',
    lines: [
      'Film side-on.',
      'Hold the phone at chest height.',
      'Keep the phone level.',
      'Use front-on only if that is the view you picked.',
    ],
  },
  {
    id: 'distance',
    title: 'Distance and framing',
    alt: 'A full body, head to feet, inside the camera frame. One person.',
    lines: [
      'Keep the whole body in frame.',
      'Head to feet, for the whole action.',
      'Bowling: stand about 8–12 m back.',
      'Batting: stand about 4–6 m back.',
      'One person in the picture.',
    ],
  },
  {
    id: 'steady',
    title: 'Steady phone',
    alt: 'A phone propped on a stand, still, with the light behind the camera.',
    lines: [
      'Use a tripod, or prop the phone up.',
      'Do not pan or zoom.',
      'Film at 30 fps or faster, or use slow motion.',
      'Put the light behind the camera.',
      'One delivery or one shot in each clip.',
      'Bowling: the last few strides, the delivery, and the follow-through.',
      'Batting: the stance, the shot, and the finish.',
      'Use your own footage. Not TV or a broadcast.',
    ],
  },
];

export function guideCard(id: GuideCardId): GuideCard {
  return GUIDE_CARDS.find((card) => card.id === id) ?? GUIDE_CARDS[0];
}

export function guideIndex(id: GuideCardId): number {
  const index = GUIDE_CARDS.findIndex((card) => card.id === id);
  return index < 0 ? 0 : index;
}

/**
 * Which card explains this result. Null when nothing in the warnings points at the guide.
 * Feet and a crowded picture both sit on the distance card. A slow or moving camera sits on
 * the steady-phone card. A view that does not match sits on the angle card.
 */
export function guideCardFor(warnings: string[]): GuideCardId | null {
  const text = warnings.join('\n').toLowerCase();
  if (text.includes('feet out of frame')) return 'distance';
  if (text.includes('more than one person')) return 'distance';
  if (text.includes(LOW_FPS_MESSAGE.toLowerCase()) || text.includes('pan') || text.includes('zoom') || text.includes('phone moved')) return 'steady';
  if (text.includes('looks front-on') || text.includes('looks side-on')) return 'angle';
  return null;
}

/** What Tab should do at the edge of the dialog. Esc always closes. */
export function guideKey(key: string, shiftKey: boolean, atFirst: boolean, atLast: boolean): 'close' | 'focus-first' | 'focus-last' | null {
  if (key === 'Escape') return 'close';
  if (key !== 'Tab') return null;
  if (shiftKey && atFirst) return 'focus-last';
  if (!shiftKey && atLast) return 'focus-first';
  return null;
}
