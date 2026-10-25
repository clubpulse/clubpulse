import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getMyTravelLog, getMyTravelStats, getClubTours } from '@/lib/actions/travel';
import { TRAVEL_MODE_CONFIG } from '@/lib/types/travel';
import { LogTravelButton } from '@/components/travel/LogTravelButton';

async function getClubId(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data?.club_id ?? null;
}

export default async function TravelPage() {
  const user = await requireUser();
  const clubId = await getClubId(user.id);

  if (!clubId) {
    return (
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', padding: '40px 0' }}>
        You&apos;re not linked to a club yet. Ask your club admin to add you.
      </p>
    );
  }

  const [statsResult, logResult, toursResult] = await Promise.all([
    getMyTravelStats(clubId),
    getMyTravelLog(clubId),
    getClubTours(clubId),
  ]);

  const stats = statsResult.success ? statsResult.data : { trip_count: 0, total_miles: 0, total_creds: 0 };
  const log = logResult.success ? logResult.data : [];
  const tours = toursResult.success ? toursResult.data : [];

  const statTiles = [
    { label: 'Trips made', value: stats.trip_count, unit: '' },
    { label: 'Miles travelled', value: stats.total_miles, unit: ' mi' },
    { label: 'Scores earned', value: stats.total_creds, unit: '' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800, fontSize: '26px',
            color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px',
          }}>
            ✈️ Travel &amp; Touring Points
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            Earn Scores for every away trip — the further you travel, the more you earn.
          </p>
        </div>
        <LogTravelButton clubId={clubId} />
      </div>

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {statTiles.map((tile) => (
          <div
            key={tile.label}
            style={{
              background: '#0f0f0f',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              padding: '16px',
            }}
          >
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'rgba(255,255,255,0.3)', margin: '0 0 8px' }}>
              {tile.label}
            </p>
            <p style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800, fontSize: '30px',
              color: '#fff', margin: 0,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {tile.value.toLocaleString()}{tile.unit}
            </p>
          </div>
        ))}
      </div>

      {/* Scores formula info */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '14px 16px',
        fontSize: '13px',
        color: 'rgba(255,255,255,0.4)',
        lineHeight: '1.5',
      }}>
        <strong style={{ color: 'rgba(255,255,255,0.65)' }}>How Scores are calculated:</strong>{' '}
        50 base + 10 per 10 miles travelled (max 300 per trip). Club tours earn a base reward plus a bonus per day attended.
      </div>

      {/* Upcoming tours */}
      {tours.length > 0 && (
        <section>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700, fontSize: '17px',
            color: '#fff', margin: '0 0 14px',
          }}>
            Upcoming tours
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tours.map((tour) => {
              const days = Math.round(
                (new Date(tour.end_date).getTime() - new Date(tour.start_date).getTime()) / 86_400_000
              ) + 1;
              const maxCreds = tour.base_creds_reward + tour.bonus_per_day * days;
              return (
                <div
                  key={tour.id}
                  style={{
                    background: '#0f0f0f',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '15px', color: '#fff', margin: '0 0 2px' }}>{tour.name}</p>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                        {tour.destination} · {tour.start_date} → {tour.end_date} · {days} day{days !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div style={{
                      background: 'rgba(155,28,28,0.12)',
                      border: '1px solid rgba(155,28,28,0.2)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      color: '#fca5a5',
                      whiteSpace: 'nowrap',
                    }}>
                      Up to {maxCreds} Scores
                    </div>
                  </div>
                  {tour.description && (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                      {tour.description}
                    </p>
                  )}
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
                    {tour.participant_count ?? 0} going · Base {tour.base_creds_reward} + {tour.bonus_per_day}/day
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent travel log */}
      <section>
        <h2 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700, fontSize: '17px',
          color: '#fff', margin: '0 0 14px',
        }}>
          My travel log
        </h2>

        {log.length === 0 ? (
          <div style={{
            background: '#0f0f0f',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px',
            padding: '32px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              No trips logged yet — use the button above to log your first away trip.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {log.map((entry) => {
              const modeConfig = TRAVEL_MODE_CONFIG[entry.travel_mode] ?? { emoji: '🚶', label: entry.travel_mode };
              return (
                <div
                  key={entry.id}
                  style={{
                    background: '#0f0f0f',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <span style={{ fontSize: '22px' }}>{modeConfig.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 500, fontSize: '14px', color: '#fff', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.destination}
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                      {entry.travel_date} · {entry.distance_miles ? `${entry.distance_miles} mi` : 'distance unknown'} · {modeConfig.label}
                    </p>
                  </div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', whiteSpace: 'nowrap' }}>
                    +{entry.creds_awarded}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
