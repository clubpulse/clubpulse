// Pure. The four role pages: one page each for player, coach, parent and club admin, holding what
// that role needs. This only says where each one's page is, how it looks, and which tools it
// puts first. Sign-up and the roles people hold are unchanged.
//
// Volunteering is no longer a role page. It is something any member can do, so its page stays
// open to everyone and sits in the Community menu.

import { NAV_GROUPS, SCHOOL_LINK, canSee, type Audience, type NavLink, type Role } from './menu';

/** A role that has its own page. Admin is the club admin. */
export type PageRole = Role | 'admin';

export type RolePage = {
  role: PageRole;
  href: string;
  title: string;
  /** The words between the person's name and the title: "Sam, as a Player" */
  lead: string;
  /** One line under the title, said to the person */
  tagline: string;
  icon: string;
  /** Two colours for the page's glow and headline */
  from: string;
  to: string;
};

export const ROLE_PAGES: Record<PageRole, RolePage> = {
  player: { role: 'player', lead: 'as a', href: '/player', title: 'Player', tagline: 'Your game, your form and your next match.', icon: '🏏', from: '#22C55E', to: '#86EFAC' },
  coach: { role: 'coach', lead: 'as a', href: '/coach', title: 'Coach', tagline: 'Your sessions, your players and your qualifications.', icon: '🎓', from: '#F97316', to: '#FDBA74' },
  parent: { role: 'parent', lead: 'as a', href: '/parent', title: 'Parent', tagline: 'Your children, their consents and what the club needs from you.', icon: '👨‍👩‍👧', from: '#A78BFA', to: '#C4B5FD' },
  admin: { role: 'admin', lead: 'as an', href: '/club-admin', title: 'Admin', tagline: 'Your club at a glance, and what is waiting for you.', icon: '🛡️', from: '#F87171', to: '#FCA5A5' },
  volunteer: { role: 'volunteer', lead: 'your', href: '/volunteer', title: 'Volunteering', tagline: 'Shifts at your club and the difference you make.', icon: '🙌', from: '#38BDF8', to: '#34D399' },
};

/** The four role pages, in the order they are listed. */
const ORDER: PageRole[] = ['player', 'coach', 'parent', 'admin'];

/** The pages this person has: one for each of the four roles they hold. */
export function rolePagesFor(audience: Audience): RolePage[] {
  return ORDER.filter((r) => holdsRole(audience, r)).map((r) => ROLE_PAGES[r]);
}

/** The cookie that remembers which role's dashboard Home last showed. */
export const ROLE_COOKIE = 'cp_role';

/**
 * The dashboard Home opens with: the one asked for, else the one last used, else the first held.
 * Null when the person holds none of the four roles (a volunteer only, say).
 */
export function homeRole(audience: Audience, asked: string | undefined, remembered: string | undefined): RolePage | null {
  const pages = rolePagesFor(audience);
  return pages.find((p) => p.role === asked) ?? pages.find((p) => p.role === remembered) ?? pages[0] ?? null;
}

/** Whether this person may open a page. Anyone may open Volunteering; the Admin page is for club admins, and the others for people who hold that role. */
export function holdsRole(audience: Audience, role: PageRole): boolean {
  if (role === 'volunteer') return true;
  if (role === 'admin') return audience.admin;
  return audience.roles.includes(role);
}

/** The tools each page leads with, by address, most useful first. */
const FEATURED: Record<PageRole, string[]> = {
  player: ['/match-day', '/availability', '/team-selection', '/analyse', '/cricket-cv', '/development', '/highlights', '/player-report', '/log-performance', '/games', '/wellbeing', '/leaderboard', '/coaching'],
  coach: ['/match-day', '/team-selection', '/coaching', '/analyse', '/qualifications', '/opposition-intel', '/player-report', '/mentor-match', '/injury-intel', '/companion'],
  parent: ['/coaching', '/match-day', '/noticeboard', '/documents', '/fee-offset', '/finance', '/club-bible', '/companion'],
  admin: [],
  volunteer: ['/match-day', '/noticeboard', '/qualifications', '/play', '/documents', '/club-bible', '/marketplace'],
};

const ALL_LINKS: NavLink[] = [...NAV_GROUPS.flatMap((g) => g.links), SCHOOL_LINK];
const TINT = new Map(NAV_GROUPS.flatMap((g) => g.links.map((l) => [l.href, g.tint] as const)));

export type RoleTool = NavLink & { tint: string };

/** The club admin's tools. These live outside the member menu, so they are listed here. */
const CLUB_TINT: Record<string, string> = {
  '/admin/club/members': '#60A5FA', '/admin/club/noticeboard': '#60A5FA', '/admin/club/availability': '#22C55E',
  '/admin/club/scores-rules': '#EFC84A', '/admin/club/scratch-cards': '#EFC84A', '/admin/club/coaches': '#F97316',
  '/admin/club/safeguarding': '#A78BFA', '/admin/club/finance': '#34D399',
};
const ADMIN_TOOLS: RoleTool[] = NAV_GROUPS.find((g) => g.key === 'club')!.links
  .filter((l) => l.href !== '/admin/club/gut-feeling')
  .map((l) => ({ ...l, tint: CLUB_TINT[l.href] ?? '#F87171' }));

/**
 * The tools shown on a role's page, in order. A junior never sees the adults-only ones, and a
 * tool that is for other roles only is left off.
 */
export function roleTools(role: PageRole, audience: Audience): RoleTool[] {
  if (role === 'admin') return ADMIN_TOOLS;
  const as: Audience = { roles: [role], junior: audience.junior, admin: false };
  return FEATURED[role].flatMap((href) => {
    const link = ALL_LINKS.find((l) => l.href === href);
    return link && canSee(link, as) ? [{ ...link, tint: TINT.get(href) ?? '#60A5FA' }] : [];
  });
}

/** True for the four role addresses, so the menu can mark them. */
export function isRolePath(pathname: string): boolean {
  return ORDER.some((r) => pathname === ROLE_PAGES[r].href);
}
