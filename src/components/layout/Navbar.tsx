'use client';
import { Glyph } from '@/components/icons/Glyph';
import { useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { RolePage } from '@/lib/nav/role-pages';
import { Avatar } from '@/components/ui/Avatar';
import { formatScores } from '@/lib/utils/format';

interface NavbarProps {
  name: string;
  balance: number;
  showAdmin?: boolean;
  /** The role pages this person has, for the switcher */
  pages?: RolePage[];
}

/**
 * Moves between a person's role pages from anywhere. It shows the role page they are on, or
 * "My pages" elsewhere, and opens a short list of the roles they hold.
 */
function RoleSwitcher({ pages }: { pages: RolePage[] }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const current = pages.find((p) => p.href === pathname) ?? null;
  if (pages.length === 0) return null;

  return (
    <details ref={menu} className="cp-roles" style={{ position: 'relative' }}>
      <summary
        aria-label="Switch between your role pages"
        style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 11px', borderRadius: '8px', cursor: 'pointer', listStyle: 'none',
          fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap',
          background: current ? `color-mix(in srgb, ${current.from} 18%, transparent)` : 'rgba(255,255,255,0.06)',
          border: `1px solid ${current ? `color-mix(in srgb, ${current.from} 45%, transparent)` : 'rgba(255,255,255,0.12)'}`,
        }}
      >
        <span aria-hidden>{current ? current.icon : '🧭'}</span>
        <span className="cp-roles-label">{current ? current.title : 'My pages'}</span>
        <span aria-hidden style={{ fontSize: '10px', opacity: 0.6 }}>▾</span>
      </summary>
      <ul style={{
        position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 60, minWidth: '190px', listStyle: 'none', margin: 0, padding: '6px',
        borderRadius: '14px', background: '#0A1330', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
      }}>
        {pages.map((page) => (
          <li key={page.role}>
            <Link
              href={page.href}
              aria-current={page.href === pathname ? 'page' : undefined}
              onClick={() => menu.current?.removeAttribute('open')}
              className="cp-roles-item"
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 11px', borderRadius: '10px', textDecoration: 'none',
                fontSize: '14px', fontWeight: 600, color: page.href === pathname ? '#fff' : 'rgba(255,255,255,0.75)',
                background: page.href === pathname ? `color-mix(in srgb, ${page.from} 20%, transparent)` : 'transparent',
              }}
            >
              <span aria-hidden style={{ fontSize: '17px' }}><Glyph e={page.icon} /></span>
              {page.title}
              {page.href === pathname && <span aria-hidden style={{ marginLeft: 'auto', color: page.from }}>●</span>}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function Navbar({ name, balance, showAdmin, pages = [] }: NavbarProps) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'rgba(4,9,26,0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: '52px',
        padding: '0 20px',
        gap: '12px',
      }}>
        {/* Logo */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none', flexShrink: 0 }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '30px', height: '30px',
            borderRadius: '7px',
            background: 'linear-gradient(145deg, #0F1F5C 0%, #1D4ED8 50%, #3B82F6 100%)',
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
              <defs>
                <linearGradient id="navPulse" x1="0" y1="0" x2="36" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7F1D1D"/>
                  <stop offset="40%" stopColor="#DC2626"/>
                  <stop offset="100%" stopColor="#1D4ED8"/>
                </linearGradient>
              </defs>
              <rect x="10.5" y="5" width="2.8" height="18" rx="1.4" fill="white"/>
              <rect x="16.6" y="5" width="2.8" height="18" rx="1.4" fill="white"/>
              <rect x="22.7" y="5" width="2.8" height="18" rx="1.4" fill="white"/>
              <rect x="10.5" y="4" width="15" height="2.5" rx="1.25" fill="white"/>
              <path d="M3 29.5 L7 29.5 L9.5 25 L12.5 33 L16 18 L19.5 29.5 L22 29.5 L25 26 L29 26 L33 26"
                    stroke="url(#navPulse)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span style={{ fontWeight: 800, fontSize: '16px', color: '#fff', letterSpacing: '-0.3px', fontFamily: 'var(--font-syne), sans-serif' }}>
            Club<span style={{ color: '#60A5FA' }}>Pulse</span>
          </span>
        </Link>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <style>{`.cp-roles summary::-webkit-details-marker{display:none}.cp-roles-item:hover{background:rgba(255,255,255,0.07)!important;color:#fff!important}@media (max-width:520px){.cp-roles-label{display:none}}`}</style>
          <RoleSwitcher pages={pages} />

          {/* Scores balance */}
          <Link
            href="/marketplace"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 11px',
              borderRadius: '8px',
              textDecoration: 'none',
              background: 'rgba(239,200,74,0.10)',
              border: '1px solid rgba(239,200,74,0.25)',
              fontSize: '13px', fontWeight: 600, color: '#EFC84A',
            }}
          >
            ⭐ {formatScores(balance)}
          </Link>

          {/* Profile avatar */}
          <Link
            href="/profile"
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '4px 10px 4px 4px',
              borderRadius: '20px',
              textDecoration: 'none',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <Avatar name={name} size="sm" />
            <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{name.split(' ')[0]}</span>
          </Link>

          {/* Sign out */}
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '7px',
                padding: '5px 9px',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
