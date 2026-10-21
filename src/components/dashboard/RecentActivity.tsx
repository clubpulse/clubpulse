import { formatScores, formatDate } from '@/lib/utils/format';
import type { WalletTransaction } from '@/lib/types/scores';

export function RecentActivity({ items }: { items: WalletTransaction[] }) {
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
        fontSize: '15px', color: '#fff', margin: '0 0 16px',
      }}>Recent activity</p>

      {items.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Nothing yet. Log a performance or sync your steps to start earning.
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {items.map((item, i) => (
            <li key={item.id} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '10px 0',
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{formatDate(item.occurred_at)}</p>
              </div>
              <span style={{
                flexShrink: 0,
                fontSize: '13px', fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: item.amount >= 0 ? '#34d399' : '#f87171',
              }}>
                {item.amount >= 0 ? '+' : ''}{formatScores(item.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
