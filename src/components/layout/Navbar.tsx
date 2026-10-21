import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { formatScores } from '@/lib/utils/format';

export function Navbar({ name, balance }: { name: string; balance: number }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@300;400;500;600&display=swap');
      `}</style>
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(8,8,8,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          maxWidth: '1152px', margin: '0 auto',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          height: '56px', padding: '0 16px',
        }}>
          <Link href="/dashboard" style={{
            display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none',
          }}>
            <span style={{
              width: '32px', height: '32px', background: '#9b1c1c',
              borderRadius: '8px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '14px', fontWeight: 800,
              color: '#fff', fontFamily: "'Syne', sans-serif",
            }}>C</span>
            <span style={{
              fontFamily: "'Syne', sans-serif", fontWeight: 700,
              fontSize: '17px', color: '#fff', letterSpacing: '-0.2px',
            }}>ClubPulse</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/dashboard"
              title="Your Scores balance"
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid rgba(201,165,76,0.35)',
                background: 'rgba(201,165,76,0.08)',
                fontSize: '13px', fontWeight: 600,
                color: '#c9a54c', textDecoration: 'none',
                letterSpacing: '0.1px',
              }}
            >
              {formatScores(balance)} Scores
            </Link>
            <Link href="/profile" aria-label="Your profile">
              <Avatar name={name} size="sm" />
            </Link>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="ghost" size="sm">Sign out</Button>
            </form>
          </div>
        </div>
      </header>
    </>
  );
}
