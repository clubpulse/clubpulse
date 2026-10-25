import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getMyMentorDashboard, getAvailableMentors } from '@/lib/actions/mentor';
import { MentorCard } from '@/components/mentor/MentorCard';
import { RegisterMentorForm } from '@/components/mentor/RegisterMentorForm';
import { LogSessionForm } from '@/components/mentor/LogSessionForm';

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '24px',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontFamily: "'Syne', sans-serif",
  fontWeight: 700,
  fontSize: '16px',
  color: '#fff',
  margin: '0 0 16px',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#c9a54c',
  accepted: '#4ade80',
  declined: '#f87171',
  completed: 'rgba(255,255,255,0.35)',
  cancelled: 'rgba(255,255,255,0.25)',
};

export default async function MentorMatchPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Get user's club membership
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  const clubId = membership?.club_id as string | undefined;

  const [dashboard, mentors] = await Promise.all([
    getMyMentorDashboard(),
    clubId ? getAvailableMentors(clubId) : Promise.resolve({ success: true as const, data: [] }),
  ]);

  const {
    myMentorProfile,
    requestsAsMentor,
    requestsAsMentee,
    sessions,
  } = dashboard.success
    ? dashboard.data
    : { myMentorProfile: null, requestsAsMentor: [], requestsAsMentee: [], sessions: [] };

  const availableMentors = mentors.success ? mentors.data : [];

  // IDs of mentors already requested
  const requestedMentorIds = new Set(requestsAsMentee.map((r) => r.mentor_user_id));

  // Active accepted request (as mentee)
  const activeMenteeRequest = requestsAsMentee.find((r) => r.status === 'accepted');

  // Pending requests I need to act on as mentor
  const pendingIncoming = requestsAsMentor.filter((r) => r.status === 'pending');

  // Accepted mentees I'm coaching
  const activeMentees = requestsAsMentor.filter((r) => r.status === 'accepted');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '26px', color: '#fff', margin: '0 0 4px',
          letterSpacing: '-0.3px',
        }}>
          🎓 Mentor Match
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          Peer coaching — earn Scores for every session
        </p>
      </div>

      {/* ── MENTOR SIDE ─────────────────────────────────────────────────────── */}

      {myMentorProfile ? (
        <section>
          <div style={{ ...cardStyle, borderColor: 'rgba(155,28,28,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ ...sectionHeadingStyle, margin: 0 }}>Your mentor profile</h2>
              <span style={{
                background: myMentorProfile.is_available ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)',
                border: `1px solid ${myMentorProfile.is_available ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius: '20px', padding: '3px 12px',
                fontSize: '12px', fontWeight: 600,
                color: myMentorProfile.is_available ? '#4ade80' : 'rgba(255,255,255,0.4)',
              }}>
                {myMentorProfile.is_available ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>{myMentorProfile.total_sessions}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Total sessions</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>
                  {myMentorProfile.avg_rating != null ? myMentorProfile.avg_rating.toFixed(1) : '—'}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Avg rating</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>{activeMentees.length}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Active mentees</div>
              </div>
            </div>

            {clubId && <RegisterMentorForm clubId={clubId} existing={myMentorProfile} />}
          </div>
        </section>
      ) : clubId ? (
        <section style={cardStyle}>
          <h2 style={sectionHeadingStyle}>Become a mentor</h2>
          <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Share your experience with junior players. Earn <strong style={{ color: '#c9a54c' }}>Scores</strong> for every session you run — 2 per minute, up to 300 per session.
          </p>
          <RegisterMentorForm clubId={clubId} />
        </section>
      ) : null}

      {/* Pending incoming requests */}
      {pendingIncoming.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>⏳ Pending requests ({pendingIncoming.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingIncoming.map((req) => (
              <div key={req.id} style={{
                ...cardStyle,
                display: 'flex', alignItems: 'flex-start', gap: '16px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                    Mentee request
                  </div>
                  {req.message && (
                    <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                      &ldquo;{req.message}&rdquo;
                    </p>
                  )}
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                    {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>
                {/* Accept/decline forms (server actions via client components are fine via form actions too) */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <form action={async () => {
                    'use server';
                    const { acceptMentorRequest } = await import('@/lib/actions/mentor');
                    await acceptMentorRequest(req.id);
                  }}>
                    <button style={{
                      background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)',
                      borderRadius: '10px', padding: '7px 14px',
                      fontSize: '13px', fontWeight: 600, color: '#4ade80', cursor: 'pointer',
                    }}>Accept</button>
                  </form>
                  <form action={async () => {
                    'use server';
                    const { declineRequest } = await import('@/lib/actions/mentor');
                    await declineRequest(req.id);
                  }}>
                    <button style={{
                      background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)',
                      borderRadius: '10px', padding: '7px 14px',
                      fontSize: '13px', fontWeight: 600, color: '#f87171', cursor: 'pointer',
                    }}>Decline</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Log session — for active mentee relationships */}
      {activeMentees.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>📋 Log a session</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            {activeMentees.map((req) => (
              <div key={req.id} style={cardStyle}>
                <p style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                  Session with mentee
                </p>
                <LogSessionForm request={req} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── MENTEE SIDE ─────────────────────────────────────────────────────── */}

      {/* My mentor status */}
      {requestsAsMentee.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>My mentor</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {requestsAsMentee.map((req) => (
              <div key={req.id} style={{
                ...cardStyle,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>
                    {req.mentor_profile
                      ? `${(req.mentor_profile as { profile?: { full_name?: string } }).profile?.full_name ?? 'Mentor'}`
                      : 'Mentor'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                    Requested {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={{
                  background: `${STATUS_COLORS[req.status] ?? 'rgba(255,255,255,0.1)'}22`,
                  border: `1px solid ${STATUS_COLORS[req.status] ?? 'rgba(255,255,255,0.1)'}55`,
                  borderRadius: '20px', padding: '3px 12px',
                  fontSize: '12px', fontWeight: 600,
                  color: STATUS_COLORS[req.status] ?? 'rgba(255,255,255,0.4)',
                  textTransform: 'capitalize',
                }}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Session history */}
      {sessions.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>Session history</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessions.map((s) => {
              const isMentor = s.mentor_user_id === user.id;
              return (
                <div key={s.id} style={{
                  ...cardStyle,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>
                      {new Date(s.session_date).toLocaleDateString()} · {s.duration_minutes} min
                    </div>
                    {s.notes && (
                      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                    <span style={{ fontSize: '13px', color: '#c9a54c', fontWeight: 700 }}>
                      +{isMentor ? s.mentor_creds_awarded : s.mentee_creds_awarded} Scores
                    </span>
                    {!isMentor && !s.mentee_rating && (
                      <RateSession sessionId={s.id} />
                    )}
                    {s.mentee_rating != null && (
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                        {'⭐'.repeat(s.mentee_rating)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Browse available mentors */}
      {!activeMenteeRequest && availableMentors.length > 0 && (
        <section>
          <h2 style={sectionHeadingStyle}>
            {requestsAsMentee.length > 0 ? 'Other available mentors' : 'Available mentors'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px' }}>
            {availableMentors.map((mentor) => (
              <MentorCard
                key={mentor.id}
                mentor={mentor}
                clubId={clubId!}
                alreadyRequested={requestedMentorIds.has(mentor.user_id)}
              />
            ))}
          </div>
        </section>
      )}

      {!clubId && (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
          Join a club to access Mentor Match.
        </p>
      )}
    </div>
  );
}

// Inline client component for rating — keeps the page a server component
function RateSession({ sessionId }: { sessionId: string }) {
  // We use a simple server action inside a form
  return (
    <form style={{ display: 'flex', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          formAction={async () => {
            'use server';
            const { rateSession } = await import('@/lib/actions/mentor');
            await rateSession(sessionId, star);
          }}
          style={{
            background: 'transparent', border: 'none',
            fontSize: '16px', cursor: 'pointer', padding: '0 1px',
            lineHeight: 1,
          }}
          title={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          ⭐
        </button>
      ))}
    </form>
  );
}
