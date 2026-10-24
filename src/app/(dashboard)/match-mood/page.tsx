import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getMyMoodCorrelation, getMyMoodHistory, getUpcomingFixturesToSetMood } from '@/lib/actions/match-mood';
import { MoodPicker } from '@/components/match-mood/MoodPicker';
import { MOOD_CONFIG, type MoodType } from '@/lib/types/match-mood';

export const metadata = { title: 'Match Mood — ClubPulse' };

export default async function MatchMoodPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Resolve the user's club
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  const clubId = membership?.club_id ?? null;

  const [upcomingResult, historyResult, correlationResult] = await Promise.all([
    clubId ? getUpcomingFixturesToSetMood(clubId) : Promise.resolve({ success: true as const, data: [] }),
    getMyMoodHistory(user.id),
    getMyMoodCorrelation(user.id),
  ]);

  const upcoming = upcomingResult.success ? upcomingResult.data : [];
  const history  = historyResult.success  ? historyResult.data  : [];
  const correlation = correlationResult.success ? correlationResult.data : [];

  const nextFixture = upcoming[0] ?? null;

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
        Match Mood 😤
      </h1>

      {/* Mood picker for next fixture */}
      {nextFixture ? (
        <MoodPicker
          fixtureId={nextFixture.id}
          initialMood={nextFixture.my_mood}
          opponent={nextFixture.opponent}
          matchDate={nextFixture.match_date}
        />
      ) : (
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
          No upcoming fixtures in the next 7 days. Check back closer to match day.
        </div>
      )}

      {/* Mood-performance correlation table */}
      {correlation.length > 0 && (
        <section>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '18px',
            color: '#fff',
            margin: '0 0 14px',
          }}>
            Your mood patterns
          </h2>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Inter', sans-serif" }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Mood', 'Games', 'Avg Runs', 'Avg Wkts', 'Form'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      textAlign: h === 'Mood' ? 'left' : 'right',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {correlation.map((row, i) => {
                  const config = MOOD_CONFIG[row.mood as MoodType];
                  return (
                    <tr key={row.mood} style={{
                      borderBottom: i < correlation.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                      <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>{config.emoji}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{config.label}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                        {row.total_games}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                        {row.avg_runs}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                        {row.avg_wickets}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                        {row.avg_form_rating}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Mood history timeline */}
      {history.length > 0 && (
        <section>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '18px',
            color: '#fff',
            margin: '0 0 14px',
          }}>
            Mood history
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.map(entry => {
              const config = MOOD_CONFIG[entry.mood as MoodType];
              const date = entry.fixture_date
                ? new Date(entry.fixture_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—';
              return (
                <div key={entry.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  <span style={{ fontSize: '26px' }}>{config.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                      vs {entry.opponent}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                      {date}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
                    {config.label}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {history.length === 0 && correlation.length === 0 && (
        <div style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.35)',
          fontFamily: "'Inter', sans-serif",
          textAlign: 'center',
          padding: '8px 0',
        }}>
          Set your first mood to start building your performance profile.
        </div>
      )}
    </div>
  );
}
