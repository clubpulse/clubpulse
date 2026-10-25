import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubTours, getClubTravelLeaderboard, getClubTravelLogs } from '@/lib/actions/travel';
import { TRAVEL_MODE_CONFIG } from '@/lib/types/travel';
import { AdminTravelPanel } from '@/components/travel/AdminTravelPanel';

export default async function AdminTravelPage() {
  const { clubId } = await requireClubAdminPage();

  const [toursResult, leaderboardResult, logsResult] = await Promise.all([
    getClubTours(clubId),
    getClubTravelLeaderboard(clubId),
    getClubTravelLogs(clubId),
  ]);

  const tours = toursResult.success ? toursResult.data : [];
  const leaderboard = leaderboardResult.success ? leaderboardResult.data : [];
  const logs = logsResult.success ? logsResult.data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800, fontSize: '24px',
          color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px',
        }}>
          ✈️ Travel &amp; Touring
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Manage club tours and award participation Scores to players.
        </p>
      </div>

      {/* Tour management — client component */}
      <AdminTravelPanel clubId={clubId} tours={tours} />

      {/* Travel leaderboard */}
      <section>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff', margin: '0 0 14px' }}>
          Travel leaderboard
        </h2>
        {leaderboard.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>No trips logged yet.</p>
        ) : (
          <div style={{
            background: '#0f0f0f',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['#', 'User ID', 'Trips', 'Miles', 'Scores'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: 'rgba(255,255,255,0.3)',
                      fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.slice(0, 20).map((row, i) => (
                  <tr key={row.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.user_id}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{row.trip_count}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{row.total_miles.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{row.total_creds.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent club travel logs */}
      <section>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff', margin: '0 0 14px' }}>
          Recent travel logs
        </h2>
        {logs.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>No trips yet.</p>
        ) : (
          <div style={{
            background: '#0f0f0f',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Date', 'Destination', 'Mode', 'Miles', 'Scores'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px',
                      textAlign: 'left',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: 'rgba(255,255,255,0.3)',
                      fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 30).map((log) => {
                  const modeConfig = TRAVEL_MODE_CONFIG[log.travel_mode] ?? { emoji: '🚶', label: log.travel_mode };
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{log.travel_date}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: '#fff', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.destination}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '14px' }}>{modeConfig.emoji}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>
                        {log.distance_miles ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                        +{log.creds_awarded}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
