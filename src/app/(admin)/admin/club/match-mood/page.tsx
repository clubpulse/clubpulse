import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getTeamMood } from '@/lib/actions/match-mood';
import { MOOD_CONFIG, type MoodType } from '@/lib/types/match-mood';

export const metadata = { title: 'Team Mood — Club Admin' };

export default async function AdminMatchMoodPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Resolve the admin's club
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .in('role', ['admin', 'coach'])
    .limit(1)
    .single();

  if (!membership) {
    return (
      <div style={{ padding: '32px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
        You don&apos;t have admin or coach access to any club.
      </div>
    );
  }

  const clubId = membership.club_id;

  // Get next upcoming fixture
  const { data: nextFixture } = await supabase
    .from('fixtures')
    .select('id, match_date, opponent')
    .eq('club_id', clubId)
    .gte('match_date', new Date().toISOString())
    .order('match_date', { ascending: true })
    .limit(1)
    .single();

  const moodResult = nextFixture
    ? await getTeamMood(nextFixture.id, clubId)
    : null;

  const summary = moodResult?.success ? moodResult.data : null;

  const moodOrder: MoodType[] = ['pumped', 'focused', 'nervous', 'tired', 'injured', 'unknown'];

  const injuredCount = summary?.moods.injured ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '720px' }}>
      <h1 style={{
        fontFamily: "'Syne', sans-serif",
        fontWeight: 800,
        fontSize: '26px',
        color: '#fff',
        margin: 0,
        letterSpacing: '-0.3px',
      }}>
        Team Mood 😤
      </h1>

      {!nextFixture ? (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.4)',
          fontSize: '14px',
          fontFamily: "'Inter', sans-serif",
        }}>
          No upcoming fixtures found for your club.
        </div>
      ) : (
        <>
          {/* Injury alert */}
          {injuredCount >= 3 && (
            <div style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontFamily: "'Inter', sans-serif",
            }}>
              <span style={{ fontSize: '22px' }}>🚨</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fca5a5' }}>
                  Injury alert — {injuredCount} player{injuredCount > 1 ? 's' : ''} marked injured
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                  Consider reviewing your squad selection before this fixture.
                </div>
              </div>
            </div>
          )}

          {/* Fixture header */}
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            padding: '24px',
            fontFamily: "'Inter', sans-serif",
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
              Next Match — {new Date(nextFixture.match_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>
              vs {nextFixture.opponent}
            </div>

            {!summary || summary.total_responses === 0 ? (
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                No moods submitted yet. Players can set their mood from the Match Mood page.
              </div>
            ) : (
              <>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
                  {summary.total_responses} of {summary.squad_size} players responded
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {moodOrder
                    .filter(mood => (summary.moods[mood] ?? 0) > 0)
                    .map(mood => {
                      const config = MOOD_CONFIG[mood];
                      const count = summary.moods[mood] ?? 0;
                      const pct = Math.round((count / summary.total_responses) * 100);
                      return (
                        <div key={mood}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '20px' }}>{config.emoji}</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', flex: 1 }}>
                              {config.label}
                            </span>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                              {count} player{count !== 1 ? 's' : ''} · {pct}%
                            </span>
                          </div>
                          <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%',
                              width: `${pct}%`,
                              borderRadius: '99px',
                              background: mood === 'pumped' ? '#f97316'
                                : mood === 'focused' ? '#3b82f6'
                                : mood === 'nervous' ? '#eab308'
                                : mood === 'tired' ? '#94a3b8'
                                : mood === 'injured' ? '#ef4444'
                                : '#6b7280',
                              transition: 'width 0.4s ease',
                            }} />
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Emoji summary row */}
                <div style={{
                  marginTop: '20px',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: "'Inter', sans-serif",
                  lineHeight: 1.6,
                }}>
                  {moodOrder
                    .filter(mood => (summary.moods[mood] ?? 0) > 0)
                    .map(mood => `${summary.moods[mood]} ${MOOD_CONFIG[mood].emoji} ${MOOD_CONFIG[mood].label}`)
                    .join(' · ')}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
