'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const NAV_LINKS = [
  { href: '/dashboard',   label: 'Home',        icon: '🏠' },
  { href: '/analyse',     label: 'Analyse',     icon: '🎯' },
  { href: '/marketplace', label: 'Marketplace', icon: '🛍️' },
  { href: '/companion',   label: 'Companion',   icon: '🧠' },
  { href: '/fee-offset',  label: 'Fee Offset',  icon: '💰' },
  { href: '/profile',     label: 'Profile',     icon: '👤' },
];

// showAdmin: club admin (club_members). isPlatformAdmin: ClubPulse staff (profiles.role = 'admin').
export function navLinks({ showAdmin = false, isPlatformAdmin = false }: { showAdmin?: boolean; isPlatformAdmin?: boolean }) {
  return [
    ...NAV_LINKS,
    ...(showAdmin ? [{ href: '/admin/club', label: 'Club admin', icon: '🛡️' }] : []),
    ...(isPlatformAdmin ? [{ href: '/admin', label: 'Admin', icon: '⚙️' }] : []),
  ];
}

export function Sidebar({ showAdmin, isPlatformAdmin }: { showAdmin: boolean; isPlatformAdmin: boolean }) {
  const pathname = usePathname();
  const links = navLinks({ showAdmin, isPlatformAdmin });

  return (
    <nav className="hidden w-56 shrink-0 md:block" aria-label="Main">
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} className="sticky top-20 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
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
        })}
      </ul>
    </nav>
  );
}
