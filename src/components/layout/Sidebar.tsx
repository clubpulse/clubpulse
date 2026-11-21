'use client';

import { Glyph } from '@/components/icons/Glyph';
import { Fragment, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { audienceLabel, menuFor, type Audience, type NavLink } from '@/lib/nav/menu';
import { rolePagesFor } from '@/lib/nav/role-pages';
import { pillarByKey } from '@/lib/nav/pillars';

// Top-level links, also used for the short list on phones
export const NAV_LINKS: NavLink[] = [
  { href: '/dashboard',   label: 'Home',        icon: '🏠' },
  { href: '/match-day',   label: 'Match Day',   icon: '🏟️' },
  { href: '/analyse',     label: 'Analysis',    icon: '🎯' },
  { href: '/companion',   label: 'Coach AI',    icon: '🧠' },
  { href: '/profile',     label: 'Profile',     icon: '👤' },
];

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
  padding: folded ? '8px 0' : '8px 12px',
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
        <span aria-hidden style={{ fontSize: small ? '14px' : '17px', lineHeight: 1 }}><Glyph e={link.icon} /></span>
        {!folded && link.label}
      </Link>
    </li>
  );
}

// audience: who is signed in, which decides the links they see (lib/nav/menu).
// showSchool: the club has an active school_programs row (looked up in DashboardShell)
export function Sidebar({ audience, isPlatformAdmin, showSchool = false }: { audience: Audience; isPlatformAdmin: boolean; showSchool?: boolean }) {
  const pathname = usePathname();
  const state = parseState(useSyncExternalStore(subscribe, readState, () => ''));
  const folded = state.folded;
  const showAdmin = audience.admin;

  const groups = menuFor(audience, { showSchool });
  const bottom: NavLink[] = [
    { href: '/profile', label: 'Profile', icon: '👤' },
    ...(showAdmin ? [{ href: '/admin/club', label: 'Club admin', icon: '🛡️' }] : []),
    ...(isPlatformAdmin ? [{ href: '/admin', label: 'Admin', icon: '⚙️' }] : []),
  ];

  // The group holding the current page is open, unless the person has opened or closed one
  // since arriving on this page
  const current = groups.find((g) => pillarByKey(g.key)?.href === pathname || g.links.some((l) => isActive(l, pathname)))?.key ?? null;
  const openKey = state.at === pathname ? state.open : current;

  return (
    <nav
      className="hidden shrink-0 md:block"
      aria-label="Main"
      style={{ width: folded ? '68px' : '232px', borderRight: '1px solid rgba(255,255,255,0.08)', transition: 'width 0.15s' }}
    >
      <style>{`.cp-nav-row:hover{background:rgba(255,255,255,0.04)!important;color:rgba(255,255,255,0.85)!important}`}</style>
      <div className="sticky top-[52px] flex h-[calc(100vh-52px)] flex-col overflow-y-auto px-2.5 py-3">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: folded ? 'center' : 'space-between', gap: '8px', marginBottom: '10px', paddingLeft: folded ? 0 : '6px' }}>
          {!folded && (
            <span
              title="The menu shows what is useful for your role"
              style={{
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', color: '#93C5FD', background: 'rgba(37,99,235,0.16)',
                border: '1px solid rgba(96,165,250,0.3)', borderRadius: '999px', padding: '4px 10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {audienceLabel(audience)}
            </span>
          )}
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
          {/* One page for each role this person holds */}
          {rolePagesFor(audience).map((page) => (
            <NavItem key={page.role} link={{ href: page.href, label: page.title, icon: page.icon }} pathname={pathname} folded={folded} />
          ))}
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
                  <span
                    aria-hidden
                    style={{
                      display: 'grid', placeItems: 'center', width: '30px', height: '30px', borderRadius: '9px', fontSize: '15px', lineHeight: 1, flexShrink: 0,
                      background: `${group.tint}${isOpen || holdsPage ? '33' : '1F'}`, border: `1px solid ${group.tint}${isOpen || holdsPage ? '80' : '40'}`,
                    }}
                  >
                    <Glyph e={group.icon} />
                  </span>
                  {!folded && (
                    <>
                      <span style={{ flex: 1, color: isOpen || holdsPage ? '#fff' : undefined, fontWeight: isOpen || holdsPage ? 600 : 500 }}>{group.label}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: group.tint, opacity: 0.9 }}>{group.links.length}</span>
                      <span aria-hidden style={{ fontSize: '11px', opacity: 0.6, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>❯</span>
                    </>
                  )}
                </button>
                {isOpen && (
                  <ul
                    id={`nav-group-${group.key}`}
                    style={{ listStyle: 'none', padding: '0 0 0 12px', margin: '4px 0 8px 28px', borderLeft: `2px solid ${group.tint}55` }}
                    className="space-y-0.5"
                  >
                    {/* A pillar opens with its own page */}
                    {pillarByKey(group.key) && (
                      <NavItem link={{ href: pillarByKey(group.key)!.href, label: 'Overview', icon: '✨' }} pathname={pathname} small />
                    )}
                    {group.links.map((link, i) => (
                      <Fragment key={link.href}>
                        {link.section && link.section !== group.links[i - 1]?.section && (
                          <li aria-hidden style={{ padding: '8px 12px 2px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                            {link.section}
                          </li>
                        )}
                        <NavItem link={link} pathname={pathname} small />
                      </Fragment>
                    ))}
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
