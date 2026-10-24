'use client';

import { formatScores, formatDate } from '@/lib/utils/format';
import type { KitRedemption } from '@/lib/types/kit-discounts';

const STATUS_STYLES: Record<string, { background: string; color: string; label: string }> = {
  pending:   { background: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: 'Pending' },
  fulfilled: { background: 'rgba(52,211,153,0.12)', color: '#34d399', label: 'Fulfilled' },
  cancelled: { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)', label: 'Cancelled' },
  refunded:  { background: 'rgba(96,165,250,0.12)', color: '#60a5fa', label: 'Refunded' },
};

export function RedemptionHistory({ redemptions }: { redemptions: KitRedemption[] }) {
  if (redemptions.length === 0) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)', background: '#0f0f0f' }}>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
          No kit redemptions yet — redeem a deal above to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{ borderRadius: '14px', border: '1px solid rgba(255,255,255,0.07)', background: '#0f0f0f', overflow: 'hidden', fontFamily: "'Inter', sans-serif" }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            {['Reward', 'Scores spent', 'Date', 'Status'].map((h) => (
              <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.35)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {redemptions.map((r, i) => {
            const style = STATUS_STYLES[r.status] ?? STATUS_STYLES.pending;
            return (
              <tr
                key={r.id}
                style={{
                  borderBottom: i < redemptions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}
              >
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: '#fff' }}>
                  {r.reward?.title ?? 'Kit reward'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#c9a54c', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {formatScores(r.creds_spent)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                  {formatDate(r.redeemed_at)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 9px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: style.background,
                    color: style.color,
                  }}>
                    {style.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
