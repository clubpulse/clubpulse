'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavLink = { href: string; label: string; icon: string };

export const NAV_LINKS: NavLink[] = [
  { href: '/dashboard',   label: 'Home',        icon: '🏠' },
  { href: '/analyse',     label: 'Analyse',     icon: '🎯' },
  { href: '/marketplace', label: 'Marketplace', icon: '🛍️' },
  { href: '/companion',   label: 'Companion',   icon: '🧠' },
  { href: '/profile',     label: 'Profile',     icon: '👤' },
];

// Everything else, in groups that open and close. Desktop sidebar only: the mobile bottom nav
// stays NAV_LINKS. A group marked adminOnly is shown to club admins and no one else.
type NavGroup = { key: string; label: string; adminOnly?: boolean; links: NavLink[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'scores',
    label: 'Scores and rewards',
    links: [
      { href: '/play', label: 'Earn Scores', icon: '💰' },
      { href: '/games', label: 'Games', icon: '🎮' },
      { href: '/scratch-cards', label: 'Scratch Cards', icon: '🎟️' },
      { href: '/leaderboard', label: 'Leaderboard', icon: '🏅' },
      { href: '/kit-discounts', label: 'Kit Discounts', icon: '🏏' },
      { href: '/fee-offset', label: 'Fee Offset', icon: '🏷️' },
      { href: '/travel', label: 'Travel', icon: '🗺️' },
      { href: '/raffle', label: 'Raffle', icon: '🎫' },
      { href: '/auction', label: 'The Auction', icon: '🔨' },
    ],
  },
  {
    key: 'game',
    label: 'My game',
    links: [
      { href: '/development', label: 'Development', icon: '📈' },
      { href: '/highlights', label: 'Highlights', icon: '🎬' },
      { href: '/player-report', label: 'Player Report', icon: '📊' },
      { href: '/log-performance', label: 'Log Game', icon: '📋' },
      { href: '/coaching', label: 'Coaching', icon: '🎓' },
      { href: '/mentor-match', label: 'Mentor Match', icon: '🤝' },
      { href: '/qualifications', label: 'Qualifications', icon: '🎖️' },
      { href: '/cricket-cv', label: 'My Cricket CV', icon: '📄' },
      { href: '/pulse-score', label: 'Pulse Score', icon: '💓' },
      { href: '/wellbeing', label: 'Wellbeing', icon: '🧡' },
    ],
  },
  {
    key: 'match',
    label: 'Match day',
    links: [
      { href: '/availability', label: 'Availability', icon: '📅' },
      { href: '/match-day', label: 'Match Day', icon: '🏏' },
      { href: '/scorecard', label: 'Scorecard', icon: '📝' },
      { href: '/match-mood', label: 'Match Mood', icon: '😤' },
      { href: '/gut-feeling', label: 'Gut Feeling', icon: '⚡' },
      { href: '/opposition-intel', label: 'Opposition Intel', icon: '🕵️' },
      { href: '/injury-intel', label: 'Injury Intel', icon: '🩹' },
      { href: '/season-wrap', label: 'Season Wrap', icon: '🏆' },
    ],
  },
  {
    key: 'club',
    label: 'My club',
    links: [
      { href: '/noticeboard', label: 'Noticeboard', icon: '📌' },
      { href: '/dressing-room', label: 'Dressing Room', icon: '👕' },
      { href: '/club-bible', label: 'Club Bible', icon: '📖' },
      { href: '/documents', label: 'Documents', icon: '🗂️' },
      { href: '/finance', label: 'Finance', icon: '💷' },
      { href: '/transfer-window', label: 'Transfer Window', icon: '🔄' },
      { href: '/club-alumni', label: 'Alumni', icon: '🎓' },
      { href: '/hall-of-infamy', label: 'Hall of Infamy', icon: '🤦' },
      { href: '/curse-the-pitch', label: 'Curse the Pitch', icon: '🌀' },
    ],
  },
  {
    key: 'giving',
    label: 'Giving back',
    links: [
      { href: '/sponsor-a-kid', label: 'Sponsor a Kid', icon: '💝' },
      { href: '/community-pot', label: 'Community Pot', icon: '🪙' },
      { href: '/charity', label: 'Charity', icon: '🤲' },
    ],
  },
  {
    key: 'tools',
    label: 'Admin tools',
    adminOnly: true,
    links: [
      { href: '/admin-query', label: 'Club Intelligence', icon: '🤖' },
      { href: '/admin/club/scout-mode', label: 'Scout Mode', icon: '🔍' },
      { href: '/admin/club/form-guide', label: 'Form Guide', icon: '📉' },
      { href: '/admin/club/gut-feeling', label: 'Gut Feeling results', icon: '🗳️' },
    ],
  },
];

/** Every grouped link in one list, for anything that needs them flat. */
export const CLUB_LINKS: NavLink[] = NAV_GROUPS.flatMap((g) => g.links);

const OPEN_KEY = 'clubpulse.sidebar.open';
const DEFAULT_OPEN = ['scores'];

// A tiny store over localStorage so the sidebar re-renders when a group is opened or closed
const openListeners = new Set<() => void>();
let lastOpen: string | null = null;

function subscribeOpen(fn: () => void) {
  openListeners.add(fn);
  return () => { openListeners.delete(fn); };
}

function readOpen(): string {
  if (lastOpen === null) {
    try {
      lastOpen = window.localStorage.getItem(OPEN_KEY) ?? '';
    } catch {
      lastOpen = '';
    }
  }
  return lastOpen;
}

function saveOpen(next: string[]) {
  lastOpen = JSON.stringify(next);
  try {
    window.localStorage.setItem(OPEN_KEY, lastOpen);
  } catch {
    // Private browsing or storage switched off: kept for this visit only
  }
  openListeners.forEach((fn) => fn());
}

function parseOpen(raw: string): string[] {
  if (!raw) return DEFAULT_OPEN;
  try {
    const saved: unknown = JSON.parse(raw);
    return Array.isArray(saved) ? saved.filter((k): k is string => typeof k === 'string') : DEFAULT_OPEN;
  } catch {
    return DEFAULT_OPEN;
  }
}

// showAdmin: club admin (club_members). isPlatformAdmin: ClubPulse staff (profiles.role = 'admin').
export function navLinks({ showAdmin = false, isPlatformAdmin = false }: { showAdmin?: boolean; isPlatformAdmin?: boolean }) {
  return [
    ...NAV_LINKS,
    ...(showAdmin ? [{ href: '/admin/club', label: 'Club admin', icon: '🛡️' }] : []),
    ...(isPlatformAdmin ? [{ href: '/admin', label: 'Admin', icon: '⚙️' }] : []),
  ];
}

function NavItem({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = isActive(link, pathname);
  return (
    <li>
      <Link
        href={link.href}
        aria-current={active ? 'page' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 12px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 500,
          textDecoration: 'none',
          transition: 'background 0.15s, color 0.15s',
          background: active ? 'rgba(37,99,235,0.18)' : 'transparent',
          color: active ? '#fff' : 'rgba(255,255,255,0.5)',
          borderLeft: active ? '2px solid #60A5FA' : '2px solid transparent',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span aria-hidden>{link.icon}</span>
        {link.label}
      </Link>
    </li>
  );
}

const isActive = (link: NavLink, pathname: string) => pathname === link.href || pathname.startsWith(`${link.href}/`);

// showSchool: the club has an active school_programs row (looked up in DashboardShell)
export function Sidebar({ showAdmin, isPlatformAdmin, showSchool = false }: { showAdmin: boolean; isPlatformAdmin: boolean; showSchool?: boolean }) {
  const pathname = usePathname();
  const links = navLinks({ showAdmin, isPlatformAdmin });
  const groups = NAV_GROUPS
    .filter((g) => !g.adminOnly || showAdmin)
    .map((g) => (g.key === 'club' && showSchool ? { ...g, links: [...g.links, { href: '/school', label: 'School', icon: '🏫' }] } : g));

  // Which groups are open, remembered in this browser. The server and the first paint use the
  // default; the group holding the current page is always open.
  const open = parseOpen(useSyncExternalStore(subscribeOpen, readOpen, () => ''));

  const toggle = (key: string) => saveOpen(open.includes(key) ? open.filter((k) => k !== key) : [...open, key]);

  return (
    <nav className="hidden w-56 shrink-0 md:block" aria-label="Main">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto pb-4">
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-1">
          {links.map((link) => <NavItem key={link.href} link={link} pathname={pathname} />)}
        </ul>

        <div className="space-y-1">
          {groups.map((group) => {
            const holdsPage = group.links.some((l) => isActive(l, pathname));
            const isOpen = holdsPage || open.includes(group.key);
            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => toggle(group.key)}
                  aria-expanded={isOpen}
                  aria-controls={`nav-group-${group.key}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                    padding: '8px 12px', borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: holdsPage ? '#60A5FA' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {group.label}
                  <span aria-hidden style={{ fontSize: '10px', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
                </button>
                {isOpen && (
                  <ul id={`nav-group-${group.key}`} style={{ listStyle: 'none', padding: 0, margin: '2px 0 6px' }} className="space-y-1">
                    {group.links.map((link) => <NavItem key={link.href} link={link} pathname={pathname} />)}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
