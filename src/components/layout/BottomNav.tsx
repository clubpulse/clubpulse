'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BOTTOM_LINKS = [
  { href: '/dashboard',   label: 'Home',     icon: '🏠' },
  { href: '/analyse',     label: 'Analyse',  icon: '🎯' },
  { href: '/scorecard',   label: 'Scores',   icon: '📋' },
  { href: '/marketplace', label: 'Rewards',  icon: '🛍️' },
  { href: '/profile',     label: 'Profile',  icon: '👤' },
];

export function BottomNav({ isPlatformAdmin = false }: { isPlatformAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: 'fixed',
        inset: 'auto 0 0 0',
        zIndex: 40,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,8,8,0.97)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        fontFamily: "'Inter', sans-serif",
      }}
      className="md:hidden"
      aria-label="Main"
    >
      <ul style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${BOTTOM_LINKS.length}, 1fr)`,
        maxWidth: '480px',
        margin: '0 auto',
        padding: '0 0 env(safe-area-inset-bottom, 0px)',
        listStyle: 'none',
      }}>
        {BOTTOM_LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '10px 4px 8px',
                  fontSize: '10px',
                  fontWeight: active ? 600 : 400,
                  textDecoration: 'none',
                  color: active ? '#c9a54c' : 'rgba(255,255,255,0.3)',
                  transition: 'color 0.15s',
                }}
              >
                <span style={{ fontSize: '20px', lineHeight: 1 }} aria-hidden>{link.icon}</span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
