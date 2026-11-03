'use client';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { formatScores } from '@/lib/utils/format';

interface NavbarProps {
  name: string;
  balance: number;
  showAdmin?: boolean;
}

export function Navbar({ name, balance, showAdmin }: NavbarProps) {
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
        maxWidth: '1200px',
        margin: '0 auto',
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
