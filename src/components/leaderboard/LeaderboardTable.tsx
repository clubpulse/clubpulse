'use client';

import type { LeaderboardEntry } from '@/lib/types/badges';

const MEDALS = ['🥇', '🥈', '🥉'];

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  badgeCounts: Record<string, number>;
}

export function LeaderboardTable({
  entries,
  currentUserId,
  badgeCounts,
}: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
        No Scores earned yet — be the first on the board!
      </p>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '14px',
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {['Rank', 'Player', 'Scores', 'Badges'].map((h) => (
              <th
                key={h}
                style={{
                  padding: '8px 12px',
                  textAlign: h === 'Rank' || h === 'Scores' || h === 'Badges' ? 'center' : 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.35)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const isMe = entry.user_id === currentUserId;
            const medal = entry.rank <= 3 ? MEDALS[entry.rank - 1] : null;
            const badgeCount = badgeCounts[entry.user_id] ?? 0;

            return (
              <tr
                key={entry.user_id}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: isMe
                    ? 'rgba(155,28,28,0.18)'
                    : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {/* Rank */}
                <td style={{ padding: '10px 12px', textAlign: 'center', minWidth: '56px' }}>
                  {medal ? (
                    <span style={{ fontSize: '18px' }}>{medal}</span>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                      #{entry.rank}
                    </span>
                  )}
                </td>

                {/* Player */}
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {entry.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.avatar_url}
                        alt=""
                        width={32}
                        height={32}
                        style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(155,28,28,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          flexShrink: 0,
                        }}
                      >
                        {(entry.full_name ?? 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span
                      style={{
                        fontWeight: isMe ? 700 : 500,
                        color: isMe ? '#fff' : 'rgba(255,255,255,0.8)',
                      }}
                    >
                      {entry.full_name ?? 'Unknown'}
                      {isMe && (
                        <span style={{ marginLeft: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                          (you)
                        </span>
                      )}
                    </span>
                  </div>
                </td>

                {/* Scores */}
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      color: isMe ? '#f87171' : 'rgba(255,255,255,0.85)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {entry.total_scores.toLocaleString()}
                  </span>
                </td>

                {/* Badges count */}
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  {badgeCount > 0 ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      🏅 {badgeCount}
                    </span>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
