// Pure. The four role pages: one page each for player, coach, parent and volunteer, holding what
// that role needs. The roles themselves are unchanged; this only says where each one's page is,
// how it looks, and which tools it puts first.

import { NAV_GROUPS, SCHOOL_LINK, canSee, type Audience, type NavLink, type Role } from './menu';

export type RolePage = {
  role: Role;
  href: string;
  title: string;
  /** One line under the title, said to the person */
  tagline: string;
  icon: string;
  /** Two colours for the page's glow and headline */
  from: string;
  to: string;
};

export const ROLE_PAGES: Record<Role, RolePage> = {
  player: { role: 'player', href: '/player', title: 'Player', tagline: 'Your game, your form and your next match.', icon: '🏏', from: '#22C55E', to: '#60A5FA' },
  coach: { role: 'coach', href: '/coach', title: 'Coach', tagline: 'Your sessions, your players and your qualifications.', icon: '🎓', from: '#F97316', to: '#EFC84A' },
  parent: { role: 'parent', href: '/parent', title: 'Parent', tagline: 'Your children, their consents and what the club needs from you.', icon: '👨‍👩‍👧', from: '#A78BFA', to: '#F472B6' },
  volunteer: { role: 'volunteer', href: '/volunteer', title: 'Volunteer', tagline: 'Your shifts and the difference you make to the club.', icon: '🙌', from: '#38BDF8', to: '#34D399' },
};

const ORDER: Role[] = ['player', 'coach', 'parent', 'volunteer'];

/** The pages this person has: one for each role they hold. A club admin can open all four. */
export function rolePagesFor(audience: Audience): RolePage[] {
  return ORDER.filter((r) => audience.admin || audience.roles.includes(r)).map((r) => ROLE_PAGES[r]);
}

export function holdsRole(audience: Audience, role: Role): boolean {
  return audience.admin || audience.roles.includes(role);
}

/** The tools each page leads with, by address, most useful first. */
const FEATURED: Record<Role, string[]> = {
  player: ['/analyse', '/availability', '/development', '/highlights', '/player-report', '/log-performance', '/games', '/leaderboard', '/cricket-cv', '/coaching', '/wellbeing', '/pulse-score'],
  coach: ['/coaching', '/analyse', '/qualifications', '/opposition-intel', '/player-report', '/mentor-match', '/match-day', '/injury-intel', '/companion'],
  parent: ['/coaching', '/match-day', '/noticeboard', '/documents', '/fee-offset', '/finance', '/club-bible', '/companion'],
  volunteer: ['/match-day', '/noticeboard', '/qualifications', '/play', '/documents', '/club-bible', '/marketplace'],
};

const ALL_LINKS: NavLink[] = [...NAV_GROUPS.flatMap((g) => g.links), SCHOOL_LINK];
const TINT = new Map(NAV_GROUPS.flatMap((g) => g.links.map((l) => [l.href, g.tint] as const)));

export type RoleTool = NavLink & { tint: string };

/**
 * The tools shown on a role's page, in order. A junior never sees the adults-only ones, and a
 * tool that is for other roles only is left off.
 */
export function roleTools(role: Role, audience: Audience): RoleTool[] {
  const as: Audience = { roles: [role], junior: audience.junior, admin: false };
  return FEATURED[role].flatMap((href) => {
    const link = ALL_LINKS.find((l) => l.href === href);
    return link && canSee(link, as) ? [{ ...link, tint: TINT.get(href) ?? '#60A5FA' }] : [];
  });
}

/** True for the four role addresses, so the menu can mark them. */
export function isRolePath(pathname: string): boolean {
  return ORDER.some((r) => pathname === ROLE_PAGES[r].href || pathname.startsWith(`${ROLE_PAGES[r].href}/`));
}
