// The four pillars, as the app's footer shows them: Technique, Community, Wellness and Academy.
// Each has its own colours, one or two leading tiles and a set of smaller ones. Mirrors the
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
  /** Keys of the tiles that lead the page, most important first */
  featured: string[];
  /** Tiles the menu does not list */
  extra: MenuLink[];
  /** Shown under the tiles when more is being built */
  soon?: string;
};

const PLAYING: MenuLink['for'] = ['player', 'coach'];

export const PILLARS: Pillar[] = [
  {
    key: 'technique', tab: 'technique', title: 'Technique', emoji: '🎯', icon: 'analytics', from: '#F97316', to: '#EFC84A',
    tagline: 'Film your batting or bowling and see exactly what to work on.',
    featured: ['analyse', 'coaching'],
    extra: [],
  },
  {
    key: 'community', tab: 'community', title: 'Community', emoji: '🤝', icon: 'people', from: '#60A5FA', to: '#A78BFA',
    tagline: 'Your club, your matches and the people you play with.',
    featured: ['club', 'coaches'],
    extra: [],
    soon: 'Cricket people across your region, beyond your own club, are on the way.',
  },
  {
    key: 'wellness', tab: 'wellness', title: 'Wellness', emoji: '🧡', icon: 'heart', from: '#34D399', to: '#38BDF8',
    tagline: 'Look after your body and get your head ready to play.',
    featured: ['soul'],
    extra: [],
    soon: 'Match-day routines and mental preparation are on the way.',
  },
  {
    key: 'academy', tab: 'learn', title: 'Academy', emoji: '📚', icon: 'school', from: '#A78BFA', to: '#F472B6',
    tagline: 'Learn the game: its Laws, its tactics and its skills.',
    featured: ['academy', 'games'],
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

/** A pillar's tiles for this person: the leading ones, then the rest. */
export function pillarTiles(key: PillarKey, viewer: Viewer): { lead: MenuLink[]; rest: MenuLink[] } {
  const pillar = pillarByKey(key);
  const group = MENU.find((g) => g.key === key);
  const all = [...(group?.links ?? []), ...pillar.extra].filter((l) => canSee(l, viewer));
  const lead = pillar.featured.map((k) => all.find((l) => l.key === k)).filter((l): l is MenuLink => !!l);
  return { lead, rest: all.filter((l) => !pillar.featured.includes(l.key)) };
}
