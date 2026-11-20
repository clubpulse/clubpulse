// The four pillars, as the app's footer shows them: Technique, Community, Wellness and Academy.
// Each has its own colours and the same layout as every other page: four tiles, one large tile
// beneath them, then smaller tiles. Mirrors the
// website's pillars (src/lib/nav/pillars.ts). Who sees a tile follows the menu's rules.

import { MENU, canSee, type MenuLink, type Viewer } from './menu';

export type PillarKey = 'technique' | 'community' | 'wellness' | 'academy';

export type Pillar = {
  key: PillarKey;
  /** The tab screen's file name in app/(tabs) */
  tab: string;
  title: string;
  emoji: string;
  /** Ionicons name for the footer */
  icon: 'analytics' | 'people' | 'heart' | 'school';
  from: string;
  to: string;
  tagline: string;
  /** The one large tile: the thing this pillar is for */
  big: string;
  /** Up to four tiles shown above it, most useful first */
  top: string[];
  /** Tiles the menu does not list */
  extra: MenuLink[];
  /** Shown under the tiles when more is being built */
  soon?: string;
};

const PLAYING: MenuLink['for'] = ['player', 'coach'];

export const PILLARS: Pillar[] = [
  {
    key: 'technique', tab: 'technique', title: 'Technique', emoji: '🎯', icon: 'analytics', from: '#FBBF24', to: '#FDE68A',
    tagline: 'Film your batting or bowling and see exactly what to work on.',
    big: 'analyse',
    top: ['coaching', 'coach-ai', 'find-coach', 'plan'],
    extra: [
      { key: 'find-coach', label: 'Find a coach', detail: 'Coaches approved by your club', icon: '🧑‍🏫', route: '/(tabs)/coaches', for: ['player', 'coach', 'parent', 'club_admin'] },
      { key: 'plan', label: 'Practice plan', detail: 'What to work on this week', icon: '🗓️', route: '/academy-plan', for: PLAYING },
    ],
  },
  {
    key: 'community', tab: 'community', title: 'Community', emoji: '🤝', icon: 'people', from: '#60A5FA', to: '#93C5FD',
    tagline: 'Your club, your matches and the people you play with.',
    big: 'club',
    top: ['children', 'post-shift', 'coaches', 'shifts', 'league', 'profile'],
    extra: [
      { key: 'league', label: 'Club league', detail: 'See where you stand', icon: '🏆', route: '/rewards' },
      { key: 'profile', label: 'My profile', detail: 'Your roles and details', icon: '👤', route: '/(tabs)/profile' },
    ],
    soon: 'Cricket people across your region, beyond your own club, are on the way.',
  },
  {
    key: 'wellness', tab: 'wellness', title: 'Wellness', emoji: '🧡', icon: 'heart', from: '#F472B6', to: '#F9A8D4',
    tagline: 'Look after your body and get your head ready to play.',
    big: 'soul',
    top: ['check-in', 'talk'],
    extra: [
      { key: 'check-in', label: 'Daily check-in', detail: 'Keep your streak going', icon: '🔥', route: '/rewards' },
      { key: 'talk', label: 'Coach AI', detail: 'Ask anything about your game', icon: '🧠', route: '/companion' },
    ],
    soon: 'Match-day routines and mental preparation are on the way.',
  },
  {
    key: 'academy', tab: 'learn', title: 'Academy', emoji: '📚', icon: 'school', from: '#2DD4BF', to: '#5EEAD4',
    tagline: 'Learn the game: its Laws, its tactics and its skills.',
    big: 'academy',
    top: ['games', 'plan', 'umpire', 'manager'],
    extra: [
      { key: 'plan', label: 'Practice plan', detail: 'What to work on this week', icon: '🗓️', route: '/academy-plan', for: PLAYING },
      { key: 'umpire', label: "Umpire's Call", detail: 'Five decisions a day', icon: '☝️', route: '/knowledge/umpire' },
      { key: 'whoami', label: 'Who Am I?', detail: 'Name the cricketer', icon: '🕵️', route: '/knowledge/whoami' },
      { key: 'scorecard', label: 'Scorecard Detective', detail: 'Find the missing number', icon: '🔢', route: '/knowledge/scorecard' },
      { key: 'manager', label: 'Season Manager', detail: 'Pick your eleven', icon: '📋', route: '/season-manager' },
      { key: 'auction', label: 'Auction Room', detail: 'Build a squad of 15', icon: '🔨', route: '/auction-room' },
    ],
  },
];

export const pillarByKey = (key: PillarKey): Pillar => PILLARS.find((p) => p.key === key)!;

/** A pillar's tiles for this person: up to four on top, the large one, then the rest. */
export function pillarTiles(key: PillarKey, viewer: Viewer): { top: MenuLink[]; big: MenuLink | null; rest: MenuLink[] } {
  const pillar = pillarByKey(key);
  const group = MENU.find((g) => g.key === key);
  const all = [...(group?.links ?? []), ...pillar.extra].filter((l) => canSee(l, viewer));
  const big = all.find((l) => l.key === pillar.big) ?? null;
  const top = pillar.top.map((k) => all.find((l) => l.key === k)).filter((l): l is MenuLink => !!l).slice(0, 4);
  const used = new Set([big?.key, ...top.map((l) => l.key)]);
  return { top, big, rest: all.filter((l) => !used.has(l.key)) };
}
