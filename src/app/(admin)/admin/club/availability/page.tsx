import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getFixtureGrid } from '@/lib/actions/availability';
import type { AvailabilityStatus } from '@/lib/types/availability';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

const STATUS_DOT: Record<AvailabilityStatus, { bg: string; label: string }> = {
  available:   { bg: '#16a34a', label: 'Available' },
  unavailable: { bg: '#dc2626', label: 'Unavailable' },
  maybe:       { bg: '#d97706', label: 'Maybe' },
  unknown:     { bg: 'rgba(255,255,255,0.15)', label: 'No response' },
};

const FORMAT_LABELS: Record<string, string> = {
  league: 'League',
  cup: 'Cup',
  friendly: 'Friendly',
  tour: 'Tour',
};

export default async function AvailabilityGridPage() {
  const { clubId } = await requireClubAdminPage();
  const rows = await getFixtureGrid(clubId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '22px',
            color: '#fff',
            margin: '0 0 2px',
            letterSpacing: '-0.3px',
          }}
        >
          Availability Grid
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          Upcoming fixtures · player responses at a glance
        </p>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '32px 20px',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>
            No upcoming fixtures. Add fixtures to start collecting availability.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rows.map((fixture) => (
            <div
              key={fixture.id}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px',
                overflow: 'hidden',
              }}
            >
              {/* Fixture header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.35)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {FORMAT_LABELS[fixture.format] ?? fixture.format}
                  </span>
                  <h2
                    style={{
                      margin: '1px 0 0',
                      fontSize: '15px',
                      fontWeight: 700,
                      color: '#fff',
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    vs {fixture.opponent}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {formatDate(fixture.match_date)}
                    {fixture.venue ? ` · ${fixture.venue}` : ''}
                  </p>
                </div>
                {/* Summary counts */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {(
                    [
                      ['available', '#4ade80'],
                      ['unavailable', '#f87171'],
                      ['maybe', '#fbbf24'],
                      ['unknown', 'rgba(255,255,255,0.35)'],
                    ] as [AvailabilityStatus, string][]
                  ).map(([status, color]) => (
                    <span
                      key={status}
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: STATUS_DOT[status].bg,
                          flexShrink: 0,
                          display: 'inline-block',
                        }}
                      />
                      {fixture.counts[status]}
                      {status === 'available'
                        ? ' available'
                        : status === 'unavailable'
                        ? ' unavailable'
                        : status === 'maybe'
                        ? ' maybe'
                        : ' unknown'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Player grid */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  padding: '12px 16px',
                }}
              >
                {fixture.players
                  .slice()
                  .sort((a, b) => {
                    const order: Record<AvailabilityStatus, number> = {
                      available: 0,
                      maybe: 1,
                      unknown: 2,
                      unavailable: 3,
                    };
                    return order[a.status] - order[b.status];
                  })
                  .map((player) => {
                    const dot = STATUS_DOT[player.status];
                    return (
                      <div
                        key={player.user_id}
                        title={`${player.display_name} — ${dot.label}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 10px',
                          borderRadius: '20px',
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: dot.bg,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {player.display_name}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
