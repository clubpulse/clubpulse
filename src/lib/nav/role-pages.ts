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
  player: { role: 'player', lead: 'as a', href: '/player', title: 'Player', tagline: 'Your game, your form and your next match.', icon: '🏏', from: '#22C55E', to: '#60A5FA' },
  coach: { role: 'coach', lead: 'as a', href: '/coach', title: 'Coach', tagline: 'Your sessions, your players and your qualifications.', icon: '🎓', from: '#F97316', to: '#EFC84A' },
  parent: { role: 'parent', lead: 'as a', href: '/parent', title: 'Parent', tagline: 'Your children, their consents and what the club needs from you.', icon: '👨‍👩‍👧', from: '#A78BFA', to: '#F472B6' },
  admin: { role: 'admin', lead: 'as an', href: '/club-admin', title: 'Admin', tagline: 'Your club at a glance, and what is waiting for you.', icon: '🛡️', from: '#F87171', to: '#F97316' },
  volunteer: { role: 'volunteer', lead: 'your', href: '/volunteer', title: 'Volunteering', tagline: 'Shifts at your club and the difference you make.', icon: '🙌', from: '#38BDF8', to: '#34D399' },
};

/** The four role pages, in the order they are listed. */
const ORDER: PageRole[] = ['player', 'coach', 'parent', 'admin'];

/** The pages this person has: one for each of the four roles they hold. */
export function rolePagesFor(audience: Audience): RolePage[] {
  return ORDER.filter((r) => holdsRole(audience, r)).map((r) => ROLE_PAGES[r]);
}

/** Whether this person may open a page. Anyone may open Volunteering; a club admin may open all. */
export function holdsRole(audience: Audience, role: PageRole): boolean {
  if (role === 'volunteer') return true;
  if (role === 'admin') return audience.admin;
  return audience.admin || audience.roles.includes(role);
}

/** The tools each page leads with, by address, most useful first. */
const FEATURED: Record<PageRole, string[]> = {
  player: ['/analyse', '/availability', '/development', '/highlights', '/player-report', '/log-performance', '/games', '/leaderboard', '/cricket-cv', '/coaching', '/wellbeing', '/pulse-score'],
  coach: ['/coaching', '/analyse', '/qualifications', '/opposition-intel', '/player-report', '/mentor-match', '/match-day', '/injury-intel', '/companion'],
  parent: ['/coaching', '/match-day', '/noticeboard', '/documents', '/fee-offset', '/finance', '/club-bible', '/companion'],
  admin: [],
  volunteer: ['/match-day', '/noticeboard', '/qualifications', '/play', '/documents', '/club-bible', '/marketplace'],
};

const ALL_LINKS: NavLink[] = [...NAV_GROUPS.flatMap((g) => g.links), SCHOOL_LINK];
const TINT = new Map(NAV_GROUPS.flatMap((g) => g.links.map((l) => [l.href, g.tint] as const)));

export type RoleTool = NavLink & { tint: string };

/** The club admin's tools. These live outside the member menu, so they are listed here. */
const ADMIN_TOOLS: RoleTool[] = [
  { href: '/admin/club', label: 'Club admin', icon: '🛡️', tint: '#F87171' },
  { href: '/admin/club/members', label: 'Members', icon: '👥', tint: '#60A5FA' },
  { href: '/admin/club/availability', label: 'Availability', icon: '📅', tint: '#22C55E' },
  { href: '/admin/club/noticeboard', label: 'Noticeboard', icon: '📌', tint: '#60A5FA' },
  { href: '/admin/club/scores-rules', label: 'Scores rules', icon: '⭐', tint: '#EFC84A' },
  { href: '/admin/club/scratch-cards', label: 'Scratch cards', icon: '🎟️', tint: '#EFC84A' },
  { href: '/admin/club/coaches', label: 'Coaches', icon: '🎓', tint: '#F97316' },
  { href: '/admin/club/safeguarding', label: 'Safeguarding', icon: '🧷', tint: '#A78BFA' },
  { href: '/admin/club/finance', label: 'Finance', icon: '💷', tint: '#34D399' },
  { href: '/admin-query', label: 'Club Intelligence', icon: '🤖', tint: '#F87171' },
  { href: '/admin/club/scout-mode', label: 'Scout Mode', icon: '🔍', tint: '#F87171' },
  { href: '/admin/club/form-guide', label: 'Form Guide', icon: '📉', tint: '#F87171' },
];

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
