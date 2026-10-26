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
      backgroundColor: 'rgba(8,8,8,0.96)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
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
            background: '#9b1c1c',
            fontSize: '13px', fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>C</span>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#f5f5f5', letterSpacing: '-0.3px' }}>ClubPulse</span>
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
              background: 'rgba(201,165,76,0.08)',
              border: '1px solid rgba(201,165,76,0.2)',
              fontSize: '13px', fontWeight: 600, color: '#c9a54c',
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
