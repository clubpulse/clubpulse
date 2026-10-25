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
  { href: '/finance', label: 'Finance', icon: '📊' },
  { href: '/coaching', label: 'Coaching', icon: '🎓' },
  { href: '/qualifications', label: 'Qualifications', icon: '🎖️' },
  { href: '/raffle', label: 'Raffle', icon: '🎟️' },
  { href: '/travel', label: 'Travel', icon: '🗺️' },
  { href: '/sponsor-a-kid', label: 'Sponsor a Kid', icon: '💝' },
  { href: '/community-pot', label: 'Community Pot', icon: '🪙' },
  { href: '/charity', label: 'Charity', icon: '🤝' },
  { href: '/cricket-cv', label: 'My Cricket CV', icon: '📄' },
  { href: '/pulse-score', label: 'Pulse Score', icon: '💓' },
  { href: '/auction', label: 'The Auction', icon: '🏏' },
  { href: '/admin/club/scout-mode', label: 'Scout Mode', icon: '🔍' },
  { href: '/wellbeing', label: 'Wellbeing', icon: '🧡' },
  { href: '/transfer-window', label: 'Transfer Window', icon: '🔄' },
  { href: '/documents', label: 'Documents', icon: '📄' },
  { href: '/noticeboard', label: 'Noticeboard', icon: '📌' },
  { href: '/match-day', label: 'Match Day', icon: '🏏' },
  { href: '/club-alumni', label: 'Alumni', icon: '🏆' },
  { href: '/availability', label: 'Availability', icon: '📅' },
  { href: '/dressing-room', label: 'Dressing Room', icon: '👕' },
  { href: '/injury-intel', label: 'Injury Intel', icon: '🩹' },
  { href: '/season-wrap', label: 'Season Wrap', icon: '🏆' },
  { href: '/admin/club/form-guide', label: 'Form Guide', icon: '📈' },
  { href: '/log-performance', label: 'Log Game', icon: '📋' },
  { href: '/match-mood', label: 'Match Mood', icon: '😤' },
  { href: '/gut-feeling', label: 'Gut Feeling', icon: '⚡' },
  { href: '/admin/club/gut-feeling', label: 'Gut Feeling ⚡', icon: '📋' },
  { href: '/hall-of-infamy', label: 'Hall of Infamy', icon: '🏆' },
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

// showSchool: the club has an active school_programs row (looked up in DashboardShell)
export function Sidebar({ showAdmin, isPlatformAdmin, showSchool = false }: { showAdmin: boolean; isPlatformAdmin: boolean; showSchool?: boolean }) {
  const pathname = usePathname();
  const links = navLinks({ showAdmin, isPlatformAdmin });
  const clubLinks = showSchool ? [...CLUB_LINKS, { href: '/school', label: 'School', icon: '🏫' }] : CLUB_LINKS;

  return (
    <nav className="hidden w-56 shrink-0 md:block" aria-label="Main">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-5 overflow-y-auto pb-4">
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-1">
          {links.map((link) => <NavItem key={link.href} link={link} pathname={pathname} />)}
        </ul>

        {clubLinks.length > 0 && (
          <div>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-600">Club</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="space-y-1">
              {clubLinks.map((link) => <NavItem key={link.href} link={link} pathname={pathname} />)}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
