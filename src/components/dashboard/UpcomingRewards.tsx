import Link from 'next/link';
import { formatScores } from '@/lib/utils/format';
import type { Reward } from '@/lib/types/reward';

export const UPCOMING_WINDOW = 200;

export function UpcomingRewards({ rewards, balance }: { rewards: Reward[]; balance: number }) {
  const upcoming = rewards
    .filter((r) => r.creds_cost > balance && r.creds_cost - balance <= UPCOMING_WINDOW)
    .slice(0, 3);

  return (
    <div style={{
      background: '#0f0f0f',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '20px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <p style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 700,
        fontSize: '13px', color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', letterSpacing: '0.8px',
        margin: '0 0 4px',
      }}>Upcoming rewards</p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: '0 0 16px' }}>
        Within {UPCOMING_WINDOW} Scores of your balance
      </p>

      {upcoming.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          No rewards within reach yet.{' '}
          <Link href="/marketplace" style={{ color: '#c9a54c', textDecoration: 'none' }}>
            Browse the marketplace
          </Link>
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {upcoming.map((reward) => {
            const progress = Math.min(100, Math.round((balance / reward.creds_cost) * 100));
            return (
              <li key={reward.id}>
                <Link href={`/marketplace/${reward.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {reward.title}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                      {formatScores(reward.creds_cost - balance)} to go
                    </span>
                  </div>
                  <div style={{ marginTop: '6px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '999px', background: '#c9a54c', width: `${progress}%` }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
