// Pure. The five items on the phone tab bar, by who is signed in. Wellness, Community and
// Rewards live in the sidebar menu, not here.

import type { Audience } from './menu';

export type BottomLink = { href: string; label: string; icon: string };

const HOME: BottomLink = { href: '/dashboard', label: 'Home', icon: '🏠' };
const MATCH_DAY: BottomLink = { href: '/match-day', label: 'Match Day', icon: '🏟️' };
const PROFILE: BottomLink = { href: '/profile', label: 'Profile', icon: '👤' };

export function bottomLinksFor(audience: Audience): BottomLink[] {
  const plays = audience.roles.includes('player') || audience.roles.includes('coach');
  // A club admin who is not a player gets the club's tools
  if (audience.admin && !plays) {
    return [
      { href: '/admin/club', label: 'Club', icon: '🛡️' },
      { href: '/admin/club/availability', label: 'Match Day', icon: '🏟️' },
      { href: '/admin/club/members', label: 'Members', icon: '👥' },
      { href: '/admin/club/finance', label: 'Finance', icon: '💷' },
      PROFILE,
    ];
  }
  // A parent does not get the player tools
  if (!plays && audience.roles.includes('parent')) {
    return [
      HOME,
      MATCH_DAY,
      { href: '/noticeboard', label: 'Club', icon: '📌' },
      { href: '/coaching', label: 'Coaching', icon: '🎓' },
      PROFILE,
    ];
  }
  return [
    HOME,
    MATCH_DAY,
    { href: '/technique', label: 'Analysis', icon: '🎯' },
    { href: '/academy', label: 'Academy', icon: '📚' },
    PROFILE,
  ];
}
