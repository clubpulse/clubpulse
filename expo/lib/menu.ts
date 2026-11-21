// The app's menu: every screen, the group it sits in, and who it is for. Mirrors the website's
// menu (src/lib/nav/menu.ts) with the screens the app has. The groups follow the four pillars
// (Technique, Community, Wellness, Academy), with Rewards alongside. Hiding a row is for tidiness only:
// each screen and the server still check for themselves what the person may do.

import type { UserRole } from './roles';
import { VOLUNTEERS_ENABLED } from '../constants/features';

export type MenuLink = {
  key: string;
  label: string;
  detail: string;
  icon: string;
  /** A route in the app. */
  route: string;
  /** Shown only to people holding one of these roles. Left out = everyone. */
  for?: UserRole[];
  /** Only for the roles in `for`: a club admin does not see it just by being an admin. */
  strict?: boolean;
  /** Hidden from junior accounts. */
  adult?: boolean;
  /** Needs a feature switch (see constants/features). */
  needs?: 'store' | 'deals' | 'cards';
};

export type MenuGroup = { key: string; label: string; icon: string; tint: string; links: MenuLink[] };

const PLAYING: UserRole[] = ['player', 'coach'];

export const MENU: MenuGroup[] = [
  {
    key: 'technique',
    label: 'The Nets',
    icon: '🎯',
    tint: '#FBBF24',
    links: [
      { key: 'analyse', label: 'Action Replay', detail: 'Analyse: film a shot or a delivery and get a mark', icon: '🎥', route: '/web?path=%2Fanalyse&title=Analyse&camera=1', for: PLAYING },
      { key: 'coaching', label: 'Coaching', detail: 'Highlights, progress and booking a coach', icon: '📈', route: '/coaching', for: ['player', 'coach', 'parent'] },
      { key: 'coach-ai', label: 'Twelfth Man', detail: 'Coach AI: ask anything about your game', icon: '🧠', route: '/companion' },
    ],
  },
  {
    key: 'community',
    label: 'Pavilion',
    icon: '🤝',
    tint: '#60A5FA',
    links: [
      { key: 'club', label: 'Clubhouse', detail: 'Your club, members and invites', icon: '🏟️', route: '/(tabs)/club' },
      { key: 'shifts', label: 'Volunteer shifts', detail: 'Sign up to help out', icon: '🙌', route: '/(tabs)/shifts' },
      { key: 'coaches', label: 'Coaches', detail: 'Coaches approved by your club', icon: '🧑‍🏫', route: '/(tabs)/coaches', for: ['player', 'coach', 'parent', 'club_admin'] },
      { key: 'children', label: 'My Juniors', detail: 'Your children: consents, details and safeguarding', icon: '👪', route: '/safeguarding', for: ['parent'], strict: true },
      { key: 'add-child', label: 'Add a Junior', detail: 'Link your child to their club', icon: '➕', route: '/register-child', for: ['parent'], strict: true },
      { key: 'post-shift', label: 'Post a shift', detail: 'Ask members for help', icon: '📣', route: '/post-shift', for: ['club_admin'] },
    ],
  },
  {
    key: 'wellness',
    label: 'Warm-Up',
    icon: '🧡',
    tint: '#F472B6',
    links: [
      { key: 'soul', label: 'My Sporting Soul', detail: 'What kind of cricketer are you?', icon: '✨', route: '/sporting-soul', for: PLAYING },
    ],
  },
  {
    key: 'academy',
    label: 'Academy',
    icon: '📚',
    tint: '#2DD4BF',
    links: [
      { key: 'academy', label: 'Coaching Manual', detail: 'Two-minute lessons and a practice plan', icon: '🎓', route: '/academy', for: PLAYING },
      { key: 'games', label: 'Match Play', detail: "Games: Umpire's Call, Who Am I?, Season Manager and more", icon: '🕹️', route: '/games' },
    ],
  },
  {
    key: 'scores',
    label: 'Bonus Points',
    icon: '⭐',
    tint: '#EFC84A',
    links: [
      { key: 'rewards', label: 'Run Chase', detail: 'Earn Scores: daily, weekly and monthly goals', icon: '🎁', route: '/rewards' },
      { key: 'cards', label: 'Scratch cards', detail: 'Free cards you have earned', icon: '🎟️', route: '/scratch-cards', adult: true, needs: 'cards' },
      { key: 'wallet', label: 'Scorebook', detail: 'Your wallet: your Scores and what you earned them for', icon: '👛', route: '/wallet' },
      { key: 'market', label: 'Marketplace', detail: 'Swap Scores for rewards', icon: '🛍️', route: '/marketplace' },
      { key: 'deals', label: 'Deals and discounts', detail: 'Earn Scores when you shop', icon: '🏷️', route: '/deals', adult: true, needs: 'deals' },
      { key: 'store', label: 'Store', detail: 'Cards and extras', icon: '🏏', route: '/store', adult: true, needs: 'store' },
    ],
  },
];

// Parked with volunteering (constants/features.ts)
const PARKED = ['shifts', 'post-shift'];

export type Viewer = { roles: UserRole[]; junior: boolean; switches: { store: boolean; deals: boolean; cards: boolean } };

export function canSee(link: MenuLink, viewer: Viewer): boolean {
  if (!VOLUNTEERS_ENABLED && PARKED.includes(link.key)) return false;
  if (link.needs && !viewer.switches[link.needs]) return false;
  if (link.adult && viewer.junior) return false;
  if (viewer.roles.includes('club_admin') && !link.strict) return true;
  // Someone with no approved role yet is treated as a player, so nobody gets an empty menu
  const roles = viewer.roles.length > 0 ? viewer.roles : (['player'] as UserRole[]);
  return !link.for || link.for.some((r) => roles.includes(r));
}

/** The groups this person sees, each with only their rows. Empty groups are dropped. */
export function menuFor(viewer: Viewer): MenuGroup[] {
  return MENU.map((g) => ({ ...g, links: g.links.filter((l) => canSee(l, viewer)) })).filter((g) => g.links.length > 0);
}
