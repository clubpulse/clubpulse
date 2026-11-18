'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavLink = { href: string; label: string; icon: string };

export const NAV_LINKS: NavLink[] = [
  { href: '/dashboard',   label: 'Home',        icon: '🏠' },
  { href: '/analyse',     label: 'Analyse',     icon: '🎯' },
  { href: '/marketplace', label: 'Marketplace', icon: '🛍️' },
  { href: '/companion',   label: 'Coach AI',    icon: '🧠' },
  { href: '/profile',     label: 'Profile',     icon: '👤' },
];

// Everything except Home sits in a handful of groups, one open at a time. Desktop sidebar only:
// the mobile bottom nav stays NAV_LINKS. A group marked adminOnly is shown to club admins only.
type NavGroup = { key: string; label: string; icon: string; adminOnly?: boolean; links: NavLink[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'match',
    label: 'Match day',
    icon: '🏏',
    links: [
      { href: '/availability', label: 'Availability', icon: '📅' },
      { href: '/match-day', label: 'Match Day', icon: '🏟️' },
      { href: '/scorecard', label: 'Scorecard', icon: '📝' },
      { href: '/match-mood', label: 'Match Mood', icon: '😤' },
      { href: '/gut-feeling', label: 'Gut Feeling', icon: '⚡' },
      { href: '/opposition-intel', label: 'Opposition Intel', icon: '🕵️' },
      { href: '/season-wrap', label: 'Season Wrap', icon: '🏆' },
    ],
  },
  {
    key: 'play',
    label: 'Play',
    icon: '🎮',
    links: [
      { href: '/games', label: 'Games', icon: '🎲' },
      { href: '/scratch-cards', label: 'Scratch Cards', icon: '🎟️' },
      { href: '/auction', label: 'The Auction', icon: '🔨' },
      { href: '/raffle', label: 'Raffle', icon: '🎫' },
      { href: '/curse-the-pitch', label: 'Curse the Pitch', icon: '🌀' },
      { href: '/leaderboard', label: 'Leaderboard', icon: '🏅' },
      { href: '/hall-of-infamy', label: 'Hall of Infamy', icon: '🤦' },
    ],
  },
  {
    key: 'game',
    label: 'My game',
    icon: '🎯',
    links: [
      { href: '/analyse', label: 'Analyse', icon: '🎥' },
      { href: '/companion', label: 'Coach AI', icon: '🧠' },
      { href: '/highlights', label: 'Highlights', icon: '🎬' },
      { href: '/development', label: 'Development', icon: '📈' },
      { href: '/player-report', label: 'Player Report', icon: '📊' },
      { href: '/log-performance', label: 'Log Game', icon: '📋' },
      { href: '/coaching', label: 'Coaching', icon: '🎓' },
      { href: '/mentor-match', label: 'Mentor Match', icon: '🤝' },
      { href: '/qualifications', label: 'Qualifications', icon: '🎖️' },
      { href: '/cricket-cv', label: 'My Cricket CV', icon: '📄' },
      { href: '/pulse-score', label: 'Pulse Score', icon: '💓' },
      { href: '/wellbeing', label: 'Wellbeing', icon: '🧡' },
      { href: '/injury-intel', label: 'Injury Intel', icon: '🩹' },
    ],
  },
  {
    key: 'scores',
    label: 'Scores',
    icon: '⭐',
    links: [
      { href: '/play', label: 'Earn Scores', icon: '💰' },
      { href: '/marketplace', label: 'Marketplace', icon: '🛍️' },
      { href: '/kit-discounts', label: 'Kit Discounts', icon: '🧢' },
      { href: '/fee-offset', label: 'Fee Offset', icon: '🏷️' },
      { href: '/travel', label: 'Travel', icon: '🗺️' },
      { href: '/sponsor-a-kid', label: 'Sponsor a Kid', icon: '💝' },
      { href: '/community-pot', label: 'Community Pot', icon: '🪙' },
      { href: '/charity', label: 'Charity', icon: '🤲' },
    ],
  },
  {
    key: 'club',
    label: 'My club',
    icon: '🛡️',
    links: [
      { href: '/noticeboard', label: 'Noticeboard', icon: '📌' },
      { href: '/dressing-room', label: 'Dressing Room', icon: '👕' },
      { href: '/club-bible', label: 'Club Bible', icon: '📖' },
      { href: '/documents', label: 'Documents', icon: '🗂️' },
      { href: '/finance', label: 'Finance', icon: '💷' },
      { href: '/transfer-window', label: 'Transfer Window', icon: '🔄' },
      { href: '/club-alumni', label: 'Alumni', icon: '🎓' },
    ],
  },
  {
    key: 'tools',
    label: 'Admin tools',
    icon: '🧰',
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

// What the sidebar remembers in this browser: which group is open, and whether it is folded
// down to icons. A tiny store over localStorage so it re-renders when either changes.
// `open` only counts on the page it was chosen on (`at`): move to another page and the menu goes
// back to showing just the group that page lives in.
type SidebarState = { open: string | null; at: string | null; folded: boolean };
const STATE_KEY = 'clubpulse.sidebar';
const DEFAULT_STATE: SidebarState = { open: null, at: null, folded: false };
const listeners = new Set<() => void>();
let lastState: string | null = null;

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function readState(): string {
  if (lastState === null) {
    try {
      lastState = window.localStorage.getItem(STATE_KEY) ?? '';
    } catch {
      lastState = '';
    }
  }
  return lastState;
}

function saveState(next: SidebarState) {
  lastState = JSON.stringify(next);
  try {
    window.localStorage.setItem(STATE_KEY, lastState);
  } catch {
    // Private browsing or storage switched off: kept for this visit only
  }
  listeners.forEach((fn) => fn());
}

function parseState(raw: string): SidebarState {
  if (!raw) return DEFAULT_STATE;
  try {
    const saved = JSON.parse(raw) as Partial<SidebarState> | null;
    return {
      open: typeof saved?.open === 'string' ? saved.open : null,
      at: typeof saved?.at === 'string' ? saved.at : null,
      folded: saved?.folded === true,
    };
  } catch {
    return DEFAULT_STATE;
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

const HOME: NavLink = { href: '/dashboard', label: 'Home', icon: '🏠' };

const isActive = (link: NavLink, pathname: string) => pathname === link.href || pathname.startsWith(`${link.href}/`);

const rowStyle = (active: boolean, folded: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: folded ? 'center' : 'flex-start',
  gap: '12px',
  width: '100%',
  padding: folded ? '10px 0' : '10px 14px',
  borderRadius: '12px',
  border: 'none',
  borderLeft: active ? '2px solid #60A5FA' : '2px solid transparent',
  background: active ? 'rgba(37,99,235,0.18)' : 'transparent',
  color: active ? '#fff' : 'rgba(255,255,255,0.55)',
  fontFamily: "'Inter', sans-serif",
  fontSize: '14px',
  fontWeight: 500,
  textDecoration: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s',
});

function NavItem({ link, pathname, folded = false, small = false }: { link: NavLink; pathname: string; folded?: boolean; small?: boolean }) {
  const active = isActive(link, pathname);
  return (
    <li>
      <Link
        href={link.href}
        aria-current={active ? 'page' : undefined}
        aria-label={folded ? link.label : undefined}
        title={folded ? link.label : undefined}
        className="cp-nav-row"
        style={{ ...rowStyle(active, folded), ...(small ? { fontSize: '13px', padding: '7px 12px', gap: '10px' } : {}) }}
      >
        <span aria-hidden style={{ fontSize: small ? '14px' : '17px', lineHeight: 1 }}>{link.icon}</span>
        {!folded && link.label}
      </Link>
    </li>
  );
}

// showSchool: the club has an active school_programs row (looked up in DashboardShell)
export function Sidebar({ showAdmin, isPlatformAdmin, showSchool = false }: { showAdmin: boolean; isPlatformAdmin: boolean; showSchool?: boolean }) {
  const pathname = usePathname();
  const state = parseState(useSyncExternalStore(subscribe, readState, () => ''));
  const folded = state.folded;

  const groups = NAV_GROUPS
    .filter((g) => !g.adminOnly || showAdmin)
    .map((g) => (g.key === 'club' && showSchool ? { ...g, links: [...g.links, { href: '/school', label: 'School', icon: '🏫' }] } : g));
  const bottom: NavLink[] = [
    { href: '/profile', label: 'Profile', icon: '👤' },
    ...(showAdmin ? [{ href: '/admin/club', label: 'Club admin', icon: '🛡️' }] : []),
    ...(isPlatformAdmin ? [{ href: '/admin', label: 'Admin', icon: '⚙️' }] : []),
  ];

  // The group holding the current page is open, unless the person has opened or closed one
  // since arriving on this page
  const current = groups.find((g) => g.links.some((l) => isActive(l, pathname)))?.key ?? null;
  const openKey = state.at === pathname ? state.open : current;

  return (
    <nav
      className="hidden shrink-0 md:block"
      aria-label="Main"
      style={{ width: folded ? '68px' : '232px', borderRight: '1px solid rgba(255,255,255,0.08)', transition: 'width 0.15s' }}
    >
      <style>{`.cp-nav-row:hover{background:rgba(255,255,255,0.04)!important;color:rgba(255,255,255,0.85)!important}`}</style>
      <div className="sticky top-[52px] flex h-[calc(100vh-52px)] flex-col overflow-y-auto px-2.5 py-3">
        <div style={{ display: 'flex', justifyContent: folded ? 'center' : 'flex-end', marginBottom: '8px' }}>
          <button
            type="button"
            onClick={() => saveState({ ...state, folded: !folded })}
            aria-label={folded ? 'Open the menu' : 'Fold the menu away'}
            title={folded ? 'Open the menu' : 'Fold the menu away'}
            style={{
              width: '30px', height: '30px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '14px', lineHeight: 1,
            }}
          >
            {folded ? '›' : '‹'}
          </button>
        </div>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-1">
          <NavItem link={HOME} pathname={pathname} folded={folded} />
          {groups.map((group) => {
            const holdsPage = group.key === current;
            const isOpen = !folded && openKey === group.key;
            return (
              <li key={group.key}>
                <button
                  type="button"
                  className="cp-nav-row"
                  onClick={() => saveState({ folded: false, at: pathname, open: isOpen ? null : group.key })}
                  aria-expanded={isOpen}
                  aria-controls={`nav-group-${group.key}`}
                  aria-label={folded ? group.label : undefined}
                  title={folded ? group.label : undefined}
                  style={rowStyle(holdsPage && !isOpen, folded)}
                >
                  <span aria-hidden style={{ fontSize: '17px', lineHeight: 1 }}>{group.icon}</span>
                  {!folded && (
                    <>
                      <span style={{ flex: 1 }}>{group.label}</span>
                      <span aria-hidden style={{ fontSize: '11px', opacity: 0.6, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>❯</span>
                    </>
                  )}
                </button>
                {isOpen && (
                  <ul
                    id={`nav-group-${group.key}`}
                    style={{ listStyle: 'none', padding: '0 0 0 14px', margin: '2px 0 6px 20px', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
                    className="space-y-0.5"
                  >
                    {group.links.map((link) => <NavItem key={link.href} link={link} pathname={pathname} small />)}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <ul style={{ listStyle: 'none', padding: '10px 0 0', margin: 'auto 0 0', borderTop: '1px solid rgba(255,255,255,0.08)' }} className="space-y-1">
          {bottom.map((link) => <NavItem key={link.href} link={link} pathname={pathname} folded={folded} />)}
        </ul>
      </div>
    </nav>
  );
}
