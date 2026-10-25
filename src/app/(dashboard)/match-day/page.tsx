import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getTodaysMatch, getRecentScorecards } from '@/lib/actions/match-day';
import { LiveScorecard } from '@/components/match-day/LiveScorecard';
import { CreateMatchForm } from '@/components/match-day/CreateMatchForm';
import type { MatchScorecard } from '@/lib/types/match-day';

async function getUserClubAndRole(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('club_members')
    .select('club_id, role, clubs(name)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data as { club_id: string; role: string; clubs: { name: string } } | null;
}

export default async function MatchDayPage() {
  const user = await requireUser();
  const membership = await getUserClubAndRole(user.id);

  if (!membership) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '26px',
          color: '#fff', margin: 0, letterSpacing: '-0.3px',
        }}>
          Match Day 🏏
        </h1>
        <div style={{
          background: 'rgba(255,255,255,0.05)', borderRadius: '16px',
          padding: '32px', textAlign: 'center', color: 'rgba(255,255,255,0.5)',
        }}>
          You are not a member of any club yet.
        </div>
      </div>
    );
  }

  const isAdmin = membership.role === 'club_admin' || membership.role === 'coach';

  const [todaysMatchRes, recentRes] = await Promise.all([
    getTodaysMatch(membership.club_id),
    getRecentScorecards(membership.club_id),
  ]);

  const todaysMatch = todaysMatchRes.success ? todaysMatchRes.data : null;
  const recent = recentRes.success ? recentRes.data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '26px',
          color: '#fff', margin: 0, letterSpacing: '-0.3px',
        }}>
          Match Day 🏏
        </h1>
        {todaysMatch && (
          <span style={{
            background: todaysMatch.status === 'completed' ? 'rgba(34,197,94,0.2)' : 'rgba(220,38,38,0.3)',
            color: todaysMatch.status === 'completed' ? '#4ade80' : '#fca5a5',
            borderRadius: '99px', padding: '4px 14px', fontSize: '13px', fontWeight: 600,
          }}>
            {todaysMatch.status === 'completed' ? 'Completed' :
             todaysMatch.status === 'our_batting' ? '🏏 We are Batting' :
             todaysMatch.status === 'our_bowling' ? '🎯 We are Bowling' : 'Setting up'}
          </span>
        )}
      </div>

      {todaysMatch ? (
        <LiveScorecard
          scorecard={todaysMatch}
          isAdmin={isAdmin}
          clubId={membership.club_id}
          currentUserId={user.id}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isAdmin && (
            <div style={{
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)',
              borderRadius: '16px', padding: '24px',
            }}>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff', margin: '0 0 16px 0' }}>
                Set up today's match
              </h2>
              <CreateMatchForm clubId={membership.club_id} />
            </div>
          )}

          {!isAdmin && (
            <div style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
              padding: '40px 24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏏</div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', margin: 0 }}>
                No match scheduled for today. Check back on match day!
              </p>
            </div>
          )}

          {recent.length > 0 && (
            <div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: '#fff', margin: '0 0 12px 0' }}>
                Recent Results
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recent.filter(m => m.status === 'completed').slice(0, 5).map((match: MatchScorecard) => (
                  <div key={match.id} style={{
                    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
                    padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <p style={{ color: '#fff', fontWeight: 600, margin: '0 0 2px 0', fontSize: '14px' }}>
                        vs {match.opposition}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '12px' }}>
                        {match.match_date}{match.venue ? ` · ${match.venue}` : ''}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {match.result && (
                        <p style={{
                          color: match.result.toLowerCase().startsWith('won') ? '#4ade80' : '#fca5a5',
                          fontWeight: 600, margin: 0, fontSize: '13px',
                        }}>
                          {match.result}
                        </p>
                      )}
                      <p style={{ color: 'rgba(255,255,255,0.4)', margin: '2px 0 0 0', fontSize: '12px' }}>
                        {(match.our_innings as { runs: number; wickets: number; overs: string }).runs}/{(match.our_innings as { runs: number; wickets: number; overs: string }).wickets} ({(match.our_innings as { runs: number; wickets: number; overs: string }).overs} ov)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
