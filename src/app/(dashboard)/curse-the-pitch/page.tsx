import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import {
  getUpcomingFixturesForVote,
  getMyPitchVotes,
  getPitchVoteAggregates,
  getGroundHistory,
  getMyPitchAccuracy,
  getPitchResult,
} from '@/lib/actions/pitch';
import { PitchVoteCard } from '@/components/pitch/PitchVoteCard';
import { PITCH_CONFIG, type PitchCondition } from '@/lib/types/pitch';

async function getUserClubId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return data?.club_id ?? null;
}

export default async function CurseThePitchPage() {
  const user = await requireUser();
  const clubId = await getUserClubId(user.id);

  if (!clubId) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '32px 0' }}>
        You are not a member of any club yet.
      </div>
    );
  }

  const [fixturesResult, myVotesResult, groundHistoryResult, accuracyResult] = await Promise.all([
    getUpcomingFixturesForVote(clubId),
    getMyPitchVotes(user.id),
    getGroundHistory(clubId),
    getMyPitchAccuracy(user.id),
  ]);

  const fixtures = fixturesResult.success ? fixturesResult.data : [];
  const nextFixture = fixtures[0] ?? null;

  // For the next fixture, load vote distribution and check if user already voted
  const myVotes = myVotesResult.success ? myVotesResult.data : [];
  const existingVote = nextFixture
    ? myVotes.find((v) => v.fixture_id === nextFixture.id)?.prediction ?? null
    : null;

  const [aggregatesResult, pitchResultResult] = nextFixture
    ? await Promise.all([
        getPitchVoteAggregates(nextFixture.id),
        getPitchResult(nextFixture.id),
      ])
    : [{ success: true as const, data: [] }, { success: true as const, data: null }];

  const aggregates = aggregatesResult.success ? aggregatesResult.data : [];
  const pitchResult = pitchResultResult.success ? pitchResultResult.data : null;

  const groundHistory = groundHistoryResult.success ? groundHistoryResult.data : [];
  const accuracy = accuracyResult.success ? accuracyResult.data : { total: 0, correct: 0, percent: 0 };
  const topGround = groundHistory[0] ?? null;

  // Past votes that are resolved
  const resolvedVotes = myVotes.filter((v) => v.is_correct !== null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '26px',
          color: '#fff',
          margin: '0 0 4px',
          letterSpacing: '-0.3px',
        }}>
          🌀 Curse the Pitch
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>
          Think you know what the surface will do? Predict right — earn 75 Scores.
        </p>
      </div>

      {/* Accuracy badge */}
      {accuracy.total > 0 && (
        <div style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Predictions', value: accuracy.total },
            { label: 'Correct', value: accuracy.correct },
            { label: 'Accuracy', value: `${accuracy.percent}%` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '12px 18px',
              minWidth: '80px',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{value}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Ground history insight */}
      {topGround && (
        <div style={{
          background: 'rgba(155,28,28,0.12)',
          border: '1px solid rgba(155,28,28,0.25)',
          borderRadius: '12px',
          padding: '12px 16px',
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            🏟️ This ground plays{' '}
            <strong style={{ color: '#fff' }}>
              {PITCH_CONFIG[topGround.condition].emoji} {PITCH_CONFIG[topGround.condition].label}
            </strong>{' '}
            most often ({topGround.times} game{topGround.times !== 1 ? 's' : ''})
          </p>
        </div>
      )}

      {/* Next fixture vote card */}
      {nextFixture ? (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>
            Next fixture
          </h2>
          <PitchVoteCard
            fixtureId={nextFixture.id}
            clubId={nextFixture.club_id}
            fixtureLabel={`vs ${nextFixture.opponent} · ${new Date(nextFixture.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
            initialVote={existingVote as PitchCondition | null}
            initialAggregates={aggregates}
            resolvedCondition={pitchResult?.actual_condition ?? null}
          />
        </section>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>
            No upcoming fixtures to vote on right now.
          </p>
        </div>
      )}

      {/* Ground history breakdown */}
      {groundHistory.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>
            Ground history
          </h2>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            overflow: 'hidden',
          }}>
            {groundHistory.map((h, i) => {
              const cfg = PITCH_CONFIG[h.condition];
              return (
                <div key={h.condition} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                }}>
                  <span style={{ fontSize: '20px' }}>{cfg.emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', flex: 1 }}>{cfg.label}</span>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                    {h.times} game{h.times !== 1 ? 's' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Past votes */}
      {resolvedVotes.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>
            Past predictions
          </h2>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px',
            overflow: 'hidden',
          }}>
            {resolvedVotes.slice(0, 10).map((vote, i) => {
              const cfg = PITCH_CONFIG[vote.prediction];
              return (
                <div key={vote.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                }}>
                  <span style={{ fontSize: '18px' }}>{vote.is_correct ? '✅' : '❌'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                      {cfg.emoji} {cfg.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
                      {new Date(vote.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  {vote.is_correct && (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80' }}>+{vote.creds_awarded} Scores</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
