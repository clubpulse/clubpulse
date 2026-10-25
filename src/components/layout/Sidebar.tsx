'use client';

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

// Club features: desktop sidebar only, under their own heading. The mobile bottom nav stays NAV_LINKS.
export const CLUB_LINKS: NavLink[] = [
  { href: '/mentor-match', label: 'Mentor Match', icon: '🎓' },
  { href: '/club-bible', label: 'Club Bible', icon: '📖' },
  { href: '/curse-the-pitch', label: 'Curse the Pitch', icon: '🌀' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏅' },
  { href: '/kit-discounts', label: 'Kit Discounts', icon: '🏏' },
  { href: '/fee-offset', label: 'Fee Offset', icon: '💰' },
  { href: '/coaching', label: 'Coaching', icon: '🎓' },
  { href: '/raffle', label: 'Raffle', icon: '🎟️' },
];

// showAdmin: club admin (club_members). isPlatformAdmin: ClubPulse staff (profiles.role = 'admin').
export function navLinks({ showAdmin = false, isPlatformAdmin = false }: { showAdmin?: boolean; isPlatformAdmin?: boolean }) {
  return [
    ...NAV_LINKS,
    ...(showAdmin ? [{ href: '/admin/club', label: 'Club admin', icon: '🛡️' }] : []),
    ...(isPlatformAdmin ? [{ href: '/admin', label: 'Admin', icon: '⚙️' }] : []),
  ];
}

function NavItem({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
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
          background: active ? 'rgba(155,28,28,0.15)' : 'transparent',
          color: active ? '#fff' : 'rgba(255,255,255,0.45)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span aria-hidden>{link.icon}</span>
        {link.label}
      </Link>
    </li>
  );
}

export function Sidebar({ showAdmin, isPlatformAdmin }: { showAdmin: boolean; isPlatformAdmin: boolean }) {
  const pathname = usePathname();
  const links = navLinks({ showAdmin, isPlatformAdmin });

  return (
    <nav className="hidden w-56 shrink-0 md:block" aria-label="Main">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-5 overflow-y-auto pb-4">
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-1">
          {links.map((link) => <NavItem key={link.href} link={link} pathname={pathname} />)}
        </ul>

        {CLUB_LINKS.length > 0 && (
          <div>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-600">Club</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-1">
              {CLUB_LINKS.map((link) => <NavItem key={link.href} link={link} pathname={pathname} />)}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
