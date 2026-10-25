import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { fetchWallet } from '@/lib/profile/service';
import { totalBalance } from '@/lib/types/scores';
import { getCoachingListings, getMyBookings, getMyCoachingRequests } from '@/lib/actions/coaching';
import { COACHING_TYPE_CONFIG, type CoachingType } from '@/lib/types/coaching';
import { CoachingCard } from '@/components/coaching/CoachingCard';
import { CreateListingForm } from '@/components/coaching/CreateListingForm';
import { CoachDashboard } from '@/components/coaching/CoachDashboard';
import { formatScores } from '@/lib/utils/format';

export const dynamic = 'force-dynamic';

export default async function CoachingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; tab?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const params = await searchParams;

  // Fetch user's club membership (first active club)
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id, role, clubs(name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  const clubId = membership?.club_id as string | undefined;

  const [wallet, listings, myBookings, coachRequests] = await Promise.all([
    fetchWallet(supabase, user.id),
    clubId ? getCoachingListings(clubId) : Promise.resolve({ success: true as const, data: [] }),
    getMyBookings(),
    getMyCoachingRequests(),
  ]);

  const balance = totalBalance(wallet.success ? wallet.data : null);
  const activeTab = params.tab ?? 'browse';
  const filterType = params.type as CoachingType | undefined;

  const allListings = listings.success ? listings.data : [];
  const filteredListings = filterType
    ? allListings.filter((l) => l.coaching_type === filterType)
    : allListings;

  const upcomingBookings = myBookings.success
    ? myBookings.data.filter((b) => b.status === 'pending' || b.status === 'confirmed')
    : [];
  const pastBookings = myBookings.success
    ? myBookings.data.filter((b) => b.status === 'completed' || b.status === 'cancelled')
    : [];

  const coachingBookings = coachRequests.success ? coachRequests.data : [];
  const isCoach = coachingBookings.length > 0 || (coachRequests.success && coachRequests.data.length > 0);
  const totalScoresEarned = coachingBookings
    .filter((b) => b.status === 'completed')
    .reduce((s, b) => s + Math.max(b.scores_paid, 50), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px' }}>
            🎓 Coaching Sessions
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            Book 1-on-1 or group sessions with qualified coaches
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ fontWeight: 700, color: '#c9a54c' }}>{formatScores(balance)} Scores</span>
          </p>
          {clubId && <CreateListingForm clubId={clubId} />}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0' }}>
        {[
          { id: 'browse', label: `Browse (${allListings.length})` },
          { id: 'my-bookings', label: `My Bookings (${upcomingBookings.length})` },
          ...(coachingBookings.length > 0 || isCoach ? [{ id: 'coach', label: 'Coach Dashboard' }] : []),
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <a
              key={tab.id}
              href={`/coaching?tab=${tab.id}`}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: active ? 600 : 400,
                color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                borderBottom: active ? '2px solid #9b1c1c' : '2px solid transparent',
                textDecoration: 'none',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </a>
          );
        })}
      </div>

      {/* Browse tab */}
      {activeTab === 'browse' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Type filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <a href="/coaching?tab=browse" style={filterChip(!filterType)}>All</a>
            {(Object.keys(COACHING_TYPE_CONFIG) as CoachingType[]).map((t) => (
              <a key={t} href={`/coaching?tab=browse&type=${t}`} style={filterChip(filterType === t)}>
                {COACHING_TYPE_CONFIG[t].emoji} {COACHING_TYPE_CONFIG[t].label}
              </a>
            ))}
          </div>

          {/* Listings grid */}
          {filteredListings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
              {clubId
                ? 'No coaching sessions available yet. Be the first to list one!'
                : 'Join a club to see coaching sessions.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
              {filteredListings.map((listing) => (
                <CoachingCard key={listing.id} listing={listing} userBalance={balance} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Bookings tab */}
      {activeTab === 'my-bookings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {upcomingBookings.length === 0 && pastBookings.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.35)', padding: '32px 0' }}>
              You have no bookings yet. Browse sessions to get started.
            </p>
          )}

          {upcomingBookings.length > 0 && (
            <section>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 12px' }}>
                Upcoming
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {upcomingBookings.map((b) => (
                  <div key={b.id} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', padding: '14px',
                  }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                      {b.listing?.title ?? 'Session'}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                      {b.session_date}
                      {b.session_time ? ` at ${b.session_time}` : ''}
                      {' · '}
                      <span style={{ color: b.status === 'confirmed' ? '#4ade80' : 'rgba(255,255,255,0.5)' }}>
                        {b.status === 'confirmed' ? 'Confirmed' : 'Awaiting confirmation'}
                      </span>
                      {b.scores_paid > 0 && (
                        <span style={{ color: '#c9a54c', marginLeft: '6px' }}>· {formatScores(b.scores_paid)} Scores paid</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {pastBookings.length > 0 && (
            <section>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 12px' }}>
                Past Sessions
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pastBookings.map((b) => (
                  <div key={b.id} style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', padding: '14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', color: '#fff' }}>
                          {b.listing?.title ?? 'Session'}
                        </p>
                        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>
                          {b.session_date}
                          {' · '}
                          <span style={{ color: b.status === 'completed' ? '#60a5fa' : '#f87171' }}>
                            {b.status === 'completed' ? 'Completed' : 'Cancelled'}
                          </span>
                        </p>
                      </div>
                      {b.status === 'completed' && b.player_rating == null && (
                        <a
                          href={`/coaching/rate/${b.id}`}
                          style={{
                            fontSize: '12px', padding: '4px 10px', borderRadius: '8px',
                            background: 'rgba(201,165,76,0.15)', color: '#c9a54c',
                            border: '1px solid rgba(201,165,76,0.3)', textDecoration: 'none',
                          }}
                        >
                          Rate ⭐
                        </a>
                      )}
                      {b.player_rating != null && (
                        <span style={{ fontSize: '13px', color: '#c9a54c' }}>⭐ {b.player_rating}/5</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Coach Dashboard tab */}
      {activeTab === 'coach' && (
        <CoachDashboard bookings={coachingBookings} totalScoresEarned={totalScoresEarned} />
      )}
    </div>
  );
}

function filterChip(active: boolean): React.CSSProperties {
  return {
    padding: '5px 12px',
    borderRadius: '20px',
    border: `1px solid ${active ? '#9b1c1c' : 'rgba(255,255,255,0.1)'}`,
    background: active ? 'rgba(155,28,28,0.2)' : 'rgba(255,255,255,0.04)',
    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
    fontSize: '12px',
    textDecoration: 'none',
    cursor: 'pointer',
    display: 'inline-block',
  };
}
