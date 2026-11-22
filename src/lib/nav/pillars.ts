// Pure. The four pillars of SHIFTUP and the page each one has. A pillar is one of the menu
// groups; this adds its address, how it is described, its colours, and what is still to come.

import { menuFor, type Audience, type NavGroup, type NavLink } from './menu';

export type PillarKey = 'technique' | 'community' | 'wellness' | 'academy';

export type Pillar = {
  key: PillarKey;
  href: string;
  title: string;
  icon: string;
  tagline: string;
  /** One line for the card on Home */
  short: string;
  from: string;
  to: string;
  /** Parts of the pillar that are planned and not built yet, named plainly */
  soon: string[];
};

export const PILLARS: Pillar[] = [
  {
    key: 'technique', href: '/technique', title: 'Analysis', icon: '🎯', from: '#FBBF24', to: '#FDE68A',
    tagline: 'Film your batting or bowling and see exactly what to work on.',
    short: 'Video analysis and coaching',
    soon: ['Front-on ball tracking', 'Your own arm baseline for the bowling check'],
  },
  {
    key: 'community', href: '/community', title: 'Community', icon: '🤝', from: '#60A5FA', to: '#93C5FD',
    tagline: 'Your club, and the people you play with.',
    short: 'Your club and the game around you',
    soon: ['The wider network (feed, connections, nets and games near you) is built and opens once final safety checks are complete', 'Club against club leaderboards'],
  },
  {
    key: 'wellness', href: '/wellness', title: 'Wellness', icon: '🧡', from: '#F472B6', to: '#F9A8D4',
    tagline: 'Your mindset, getting ready and being mentally prepared to play.',
    short: 'Mindset and mental readiness',
    soon: ['Support for a bad run of form', 'Animated breathing circle on the web (in the app today)'],
  },
  {
    key: 'academy', href: '/academy', title: 'Academy', icon: '📚', from: '#2DD4BF', to: '#5EEAD4',
    tagline: 'Learn the game: its Laws, its tactics and its skills.',
    short: 'Learn the Laws, tactics and skills',
    soon: ['Courses written by your own club’s coaches'],
  },
];

export const pillarByKey = (key: string): Pillar | null => PILLARS.find((p) => p.key === key) ?? null;

/** With the Community open, the wider network is no longer "on the way", so that line goes. */
export function whenOpen(pillar: Pillar, communityOpen: boolean): Pillar {
  if (pillar.key !== 'community' || !communityOpen) return pillar;
  return { ...pillar, tagline: 'Your club, and cricket people across clubs.', soon: pillar.soon.filter((s) => !s.startsWith('The wider network')) };
}

/** A pillar's pages for this person, in sections. Links with no section come first, untitled. */
export function pillarSections(key: PillarKey, audience: Audience, options: { showSchool?: boolean; community?: boolean } = {}): Array<{ title: string | null; links: NavLink[] }> {
  const group: NavGroup | undefined = menuFor(audience, options).find((g) => g.key === key);
  const out: Array<{ title: string | null; links: NavLink[] }> = [];
  for (const link of group?.links ?? []) {
    const title = link.section ?? null;
    const last = out.find((s) => s.title === title);
    if (last) last.links.push(link);
    else out.push({ title, links: [link] });
  }
  return out;
}

/** How many pages each pillar holds for this person, for the cards on Home. */
export function pillarCounts(audience: Audience): Record<PillarKey, number> {
  const groups = menuFor(audience);
  const count = (key: PillarKey) => groups.find((g) => g.key === key)?.links.length ?? 0;
  return { technique: count('technique'), community: count('community'), wellness: count('wellness'), academy: count('academy') };
}

/** The pillar a page belongs to, so the menu can mark its pillar page too. */
export function isPillarPath(pathname: string): boolean {
  return PILLARS.some((p) => pathname === p.href);
}
