// The app's menu: every screen, the group it sits in, and who it is for. Mirrors the website's
// menu (src/lib/nav/menu.ts) with the screens the app has. Hiding a row is for tidiness only:
// each screen and the server still check for themselves what the person may do.

import type { UserRole } from './roles';

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
    key: 'play',
    label: 'Play',
    icon: '🎮',
    tint: '#A78BFA',
    links: [
      { key: 'rewards', label: 'Rewards', detail: 'Daily, weekly and monthly goals', icon: '🎁', route: '/rewards' },
      { key: 'auction', label: 'Auction Room', detail: 'Build a squad of 15 at a T20 auction', icon: '🔨', route: '/auction-room' },
      { key: 'cards', label: 'Scratch cards', detail: 'Free cards you have earned', icon: '🎟️', route: '/scratch-cards', adult: true, needs: 'cards' },
    ],
  },
  {
    key: 'game',
    label: 'My game',
    icon: '🎯',
    tint: '#F97316',
    links: [
      { key: 'coaching', label: 'Coaching and video', detail: 'Film your technique, track progress, book a coach', icon: '🎥', route: '/coaching', for: ['player', 'coach', 'parent'] },
      { key: 'academy', label: 'Academy', detail: 'Two-minute lessons and a practice plan', icon: '🎓', route: '/academy', for: PLAYING },
      { key: 'coach-ai', label: 'Coach AI', detail: 'Ask anything about your game', icon: '🧠', route: '/companion' },
      { key: 'soul', label: 'My Sporting Soul', detail: 'What kind of cricketer are you?', icon: '✨', route: '/sporting-soul', for: PLAYING },
    ],
  },
  {
    key: 'scores',
    label: 'Scores',
    icon: '⭐',
    tint: '#EFC84A',
    links: [
      { key: 'wallet', label: 'Wallet', detail: 'Your Scores and what you earned them for', icon: '👛', route: '/wallet' },
      { key: 'market', label: 'Marketplace', detail: 'Swap Scores for rewards', icon: '🛍️', route: '/marketplace' },
      { key: 'deals', label: 'Deals and discounts', detail: 'Earn Scores when you shop', icon: '🏷️', route: '/deals', adult: true, needs: 'deals' },
      { key: 'store', label: 'Store', detail: 'Cards and extras', icon: '🏏', route: '/store', adult: true, needs: 'store' },
    ],
  },
  {
    key: 'club',
    label: 'My club',
    icon: '🛡️',
    tint: '#60A5FA',
    links: [
      { key: 'club', label: 'Club', detail: 'Your club, members and invites', icon: '🏟️', route: '/(tabs)/club' },
      { key: 'shifts', label: 'Volunteer shifts', detail: 'Sign up to help out', icon: '🤝', route: '/(tabs)/shifts' },
      { key: 'coaches', label: 'Coaches', detail: 'Coaches approved by your club', icon: '🧑‍🏫', route: '/(tabs)/coaches', for: ['player', 'coach', 'parent', 'club_admin'] },
      { key: 'children', label: 'My children', detail: 'Consents, details and safeguarding', icon: '👪', route: '/safeguarding', for: ['parent'], strict: true },
      { key: 'add-child', label: 'Add a child', detail: 'Link your child to their club', icon: '➕', route: '/register-child', for: ['parent'], strict: true },
      { key: 'post-shift', label: 'Post a shift', detail: 'Ask members for help', icon: '📣', route: '/post-shift', for: ['club_admin'] },
    ],
  },
];

export type Viewer = { roles: UserRole[]; junior: boolean; switches: { store: boolean; deals: boolean; cards: boolean } };

export function canSee(link: MenuLink, viewer: Viewer): boolean {
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
