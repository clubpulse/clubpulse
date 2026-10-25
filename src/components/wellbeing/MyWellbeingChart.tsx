'use client';

import type { WellbeingCheckin } from '@/lib/types/wellbeing';
import { RATING_LABELS } from '@/lib/types/wellbeing';

interface Props {
  checkins: WellbeingCheckin[];
  weeks?: number;
}

function ratingColor(r: number): string {
  const map: Record<number, string> = {
    1: '#dc2626',
    2: '#ea580c',
    3: '#ca8a04',
    4: '#16a34a',
    5: '#059669',
  };
  return map[r] ?? '#4b5563';
}

function formatWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function MyWellbeingChart({ checkins, weeks = 8 }: Props) {
  // Build a list of the last N weeks (Mon dates), newest first
  const allWeeks: string[] = [];
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const thisMonday = new Date(new Date().setDate(diff));

  for (let i = 0; i < weeks; i++) {
    const d = new Date(thisMonday);
    d.setDate(d.getDate() - i * 7);
    allWeeks.push(d.toISOString().split('T')[0]);
  }

  const byWeek = new Map<string, WellbeingCheckin>();
  for (const c of checkins) {
    byWeek.set(c.check_week, c);
  }

  if (checkins.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" }}>
        No history yet — submit your first check-in above.
      </p>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: '0 4px', width: '100%', minWidth: '400px' }}>
          <thead>
            <tr>
              <th style={{ width: '80px', textAlign: 'left', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 500, paddingBottom: '6px' }}>
                Week
              </th>
              {allWeeks.map((w) => (
                <th key={w} style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 500, paddingBottom: '6px', minWidth: '36px' }}>
                  {formatWeek(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['physical_rating', 'mental_rating'] as const).map((field) => (
              <tr key={field}>
                <td style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', paddingRight: '8px', whiteSpace: 'nowrap' }}>
                  {field === 'physical_rating' ? '💪 Physical' : '🧠 Mental'}
                </td>
                {allWeeks.map((w) => {
                  const checkin = byWeek.get(w);
                  const rating = checkin ? checkin[field] : null;
                  return (
                    <td key={w} style={{ textAlign: 'center', padding: '4px 2px' }}>
                      {rating !== null ? (
                        <div
                          title={`${RATING_LABELS[rating].label} (${rating}/5)`}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: ratingColor(rating),
                            margin: '0 auto',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            color: '#fff',
                            fontWeight: 700,
                          }}
                        >
                          {rating}
                        </div>
                      ) : (
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          margin: '0 auto',
                        }} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {[1,2,3,4,5].map((r) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: ratingColor(r), flexShrink: 0 }} />
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{r} — {RATING_LABELS[r].label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
