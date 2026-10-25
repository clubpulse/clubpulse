'use client';

import { useState } from 'react';
import type { AnonymousPlayerStat, ScoutSession } from '@/lib/types/scout';

interface Props {
  stats: AnonymousPlayerStat[];
  session: ScoutSession;
  allowReveal?: boolean; // only true on admin page
}

export function ScoutDataTable({ stats, session, allowReveal = false }: Props) {
  const [revealed, setRevealed] = useState(false);

  // Build a reverse map code -> user_id for reveal mode
  const codeToUserId = Object.entries(session.player_codes).reduce<Record<string, string>>(
    (acc, [uid, code]) => ({ ...acc, [code]: uid }),
    {}
  );

  const thStyle: React.CSSProperties = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.7px',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.3)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    fontSize: '13px',
    color: 'rgba(255,255,255,0.75)',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    fontVariantNumeric: 'tabular-nums',
  };

  const codeTdStyle: React.CSSProperties = {
    ...tdStyle,
    fontWeight: 600,
    color: '#fff',
    fontFamily: "'Syne', sans-serif",
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {allowReveal && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setRevealed((r) => !r)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: revealed ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${revealed ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 500,
              color: revealed ? '#fde047' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.15s',
            }}
          >
            {revealed ? '🙈 Hide names' : '👁 Reveal names (admin only)'}
          </button>
        </div>
      )}

      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '14px',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Player</th>
              {revealed && allowReveal && <th style={thStyle}>User ID</th>}
              <th style={{ ...thStyle, textAlign: 'right' }}>Matches</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Runs</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Wickets</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Catches</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Avail %</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr>
                <td
                  colSpan={revealed && allowReveal ? 7 : 6}
                  style={{ ...tdStyle, textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '24px' }}
                >
                  No player data for this session.
                </td>
              </tr>
            ) : (
              stats.map((stat) => (
                <tr key={stat.code}>
                  <td style={codeTdStyle}>{stat.code}</td>
                  {revealed && allowReveal && (
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                      {codeToUserId[stat.code] ?? '—'}
                    </td>
                  )}
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{stat.matches}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{stat.runs ?? '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{stat.wickets ?? '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{stat.catches ?? '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    {stat.availability_rate != null ? `${stat.availability_rate}%` : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
