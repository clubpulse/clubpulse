'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navLinks } from '@/components/layout/Sidebar';

export function BottomNav({ isPlatformAdmin = false }: { isPlatformAdmin?: boolean }) {
  const pathname = usePathname();
  const links = navLinks({ isPlatformAdmin });

  return (
    <nav
      style={{
        position: 'fixed',
        inset: 'auto 0 0 0',
        zIndex: 40,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,8,8,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        fontFamily: "'Inter', sans-serif",
      }}
      className="md:hidden"
      aria-label="Main"
    >
      <ul style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${links.length}, 1fr)`,
        maxWidth: '448px',
        margin: '0 auto',
        padding: 0,
        listStyle: 'none',
      }}>
        {links.map((link) => {
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
                  gap: '2px',
                  padding: '8px 4px',
                  fontSize: '11px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: active ? '#c9a54c' : 'rgba(255,255,255,0.35)',
                  transition: 'color 0.15s',
                }}
              >
                <span style={{ fontSize: '18px' }} aria-hidden>{link.icon}</span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
