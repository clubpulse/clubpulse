'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Grouped nav structure
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: '/dashboard',        label: 'Home',        icon: '🏠' },
      { href: '/analyse',          label: 'Analyse',     icon: '🎯' },
      { href: '/profile',          label: 'Profile',     icon: '👤' },
    ],
  },
  {
    label: 'Match',
    items: [
      { href: '/scorecard',        label: 'Scorecard',   icon: '📋' },
      { href: '/highlights',       label: 'Highlights',  icon: '🎬' },
      { href: '/coaching-history', label: 'Progress',    icon: '📈' },
    ],
  },
  {
    label: 'Club',
    items: [
      { href: '/marketplace',      label: 'Marketplace', icon: '🛍️' },
      { href: '/companion',        label: 'Companion',   icon: '🧠' },
      { href: '/club-alumni',      label: 'Alumni',      icon: '🏆' },
    ],
  },
  {
    label: 'More',
    items: [
      { href: '/leaderboards',     label: 'Leaderboard', icon: '📊' },
      { href: '/finance',          label: 'Finance',     icon: '💷' },
      { href: '/fee-offset',       label: 'Fee Offset',  icon: '🏷️' },
      { href: '/kit-discounts',    label: 'Kit Discounts', icon: '👕' },
      { href: '/travel',           label: 'Travel',      icon: '✈️' },
      { href: '/raffle',           label: 'Raffle',      icon: '🎟️' },
      { href: '/charity',          label: 'Charity',     icon: '❤️' },
      { href: '/coaching',         label: 'Coaching',    icon: '🏏' },
      { href: '/qualifications',   label: 'Qualifications', icon: '📜' },
      { href: '/mentor-match',     label: 'Mentor',      icon: '🤝' },
      { href: '/sponsor-a-kid',    label: 'Sponsor a Kid', icon: '🌱' },
      { href: '/community-pot',    label: 'Community Pot', icon: '🫙' },
      { href: '/gut-feeling',      label: 'Predictions', icon: '🔮' },
      { href: '/curse-the-pitch',  label: 'Curse Pitch', icon: '⚡' },
      { href: '/pulse-score',      label: 'Pulse Score', icon: '💓' },
      { href: '/my-cricket-cv',    label: 'Cricket CV',  icon: '📄' },
    ],
  },
];

// Flat list used by BottomNav (top 5 only)
export const NAV_LINKS = NAV_GROUPS.flatMap(g => g.items);

export function navLinks({ showAdmin = false, isPlatformAdmin = false }: { showAdmin?: boolean; isPlatformAdmin?: boolean }) {
  return [
    ...NAV_LINKS,
    ...(showAdmin ? [{ href: '/admin/club', label: 'Club admin', icon: '🛡️' }] : []),
    ...(isPlatformAdmin ? [{ href: '/admin', label: 'Admin', icon: '⚙️' }] : []),
  ];
}

export function Sidebar({ showAdmin, isPlatformAdmin }: { showAdmin: boolean; isPlatformAdmin: boolean }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      className="hidden md:block"
      style={{ width: '192px', flexShrink: 0 }}
      aria-label="Main"
    >
      <div style={{ position: 'sticky', top: '72px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: group.label === 'More' ? 0 : '4px' }}>
            {group.label && (
              <p style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.2)',
                margin: '12px 12px 4px',
              }}>
                {group.label}
              </p>
            )}
            {group.items.map(link => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '9px',
                    padding: '7px 12px',
                    borderRadius: '9px',
                    fontSize: '13.5px',
                    fontWeight: active ? 600 : 400,
                    textDecoration: 'none',
                    transition: 'background 0.12s, color 0.12s',
                    background: active ? 'rgba(155,28,28,0.18)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.38)',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <span style={{ fontSize: '14px', lineHeight: 1 }} aria-hidden>{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Admin / platform links */}
        {(showAdmin || isPlatformAdmin) && (
          <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', margin: '0 12px 4px' }}>
              Admin
            </p>
            {showAdmin && (
              <Link
                href="/admin/club"
                aria-current={isActive('/admin/club') ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  padding: '7px 12px', borderRadius: '9px',
                  fontSize: '13.5px', fontWeight: isActive('/admin/club') ? 600 : 400,
                  textDecoration: 'none',
                  background: isActive('/admin/club') ? 'rgba(155,28,28,0.18)' : 'transparent',
                  color: isActive('/admin/club') ? '#fff' : 'rgba(255,255,255,0.38)',
                  fontFamily: "'Inter', sans-serif",
                  transition: 'background 0.12s, color 0.12s',
                }}
              >
                <span style={{ fontSize: '14px' }}>🛡️</span> Club admin
              </Link>
            )}
            {isPlatformAdmin && (
              <Link
                href="/admin"
                style={{
                  display: 'flex', alignItems: 'center', gap: '9px',
                  padding: '7px 12px', borderRadius: '9px',
                  fontSize: '13.5px', fontWeight: 400,
                  textDecoration: 'none',
                  color: 'rgba(255,255,255,0.38)',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <span style={{ fontSize: '14px' }}>⚙️</span> Admin
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
