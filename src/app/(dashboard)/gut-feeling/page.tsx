import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import {
  getUpcomingFixturesForPrediction,
  getMyPredictions,
  getMySeasonStats,
} from '@/lib/actions/gut-feeling';
import { PredictionCard } from '@/components/gut-feeling/PredictionCard';
import type { PredictionOutcome } from '@/lib/types/gut-feeling';

function StatPill({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: '#0f0f0f',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
      padding: '16px 20px',
      flex: '1 1 120px',
    }}>
      <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif", letterSpacing: '-0.5px' }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: '2px' }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>{sub}</div>
      )}
    </div>
  );
}

export default async function GutFeelingPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  const clubId = membership?.club_id;

  const [upcomingResult, predictionsResult, statsResult] = await Promise.all([
    clubId ? getUpcomingFixturesForPrediction(clubId) : Promise.resolve({ success: true as const, data: [] }),
    getMyPredictions(user.id),
    getMySeasonStats(user.id),
  ]);

  const upcoming = upcomingResult.success ? upcomingResult.data : [];
  const predictions = predictionsResult.success ? predictionsResult.data : [];
  const stats = statsResult.success
    ? statsResult.data
    : { total_predictions: 0, correct_predictions: 0, accuracy_percent: 0, total_creds_earned: 0, current_streak: 0 };

  // Past predictions (resolved or locked)
  const past = predictions.filter((p) => p.fixture?.result || p.is_correct !== null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '26px',
          color: '#fff',
          margin: '0 0 6px',
          letterSpacing: '-0.4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          ⚡ Your Gut Feeling
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          Trust your gut. Earn your Scores. Correct calls bag you 100 Scores a pop.
        </p>
      </div>

      {/* Season stats */}
      {stats.total_predictions > 0 && (
        <div>
          <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Season so far
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <StatPill
              label="Accuracy"
              value={`${stats.accuracy_percent}%`}
              sub={`${stats.correct_predictions}/${predictions.filter(p => p.is_correct !== null).length} resolved`}
            />
            <StatPill
              label="Streak"
              value={stats.current_streak > 0 ? `🔥 ${stats.current_streak}` : stats.current_streak}
              sub="consecutive correct"
            />
            <StatPill
              label="Scores earned"
              value={stats.total_creds_earned}
              sub="from gut calls"
            />
            <StatPill
              label="Total calls"
              value={stats.total_predictions}
            />
          </div>
        </div>
      )}

      {/* Upcoming fixtures to predict */}
      {upcoming.length > 0 && (
        <div>
          <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Upcoming — make your call
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcoming.map((fixture) => (
              <PredictionCard
                key={fixture.id}
                fixtureId={fixture.id}
                opponent={fixture.opponent}
                matchDate={fixture.match_date}
                venue={fixture.venue}
              />
            ))}
          </div>
        </div>
      )}

      {upcoming.length === 0 && !clubId && (
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '14px',
        }}>
          You need to be an active club member to make predictions.
        </div>
      )}

      {upcoming.length === 0 && clubId && (
        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '14px',
        }}>
          No upcoming fixtures to predict on right now. Check back when fixtures are posted.
        </div>
      )}

      {/* Past predictions */}
      {past.length > 0 && (
        <div>
          <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Past calls
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {past.map((prediction) => (
              <PredictionCard
                key={prediction.id}
                fixtureId={prediction.fixture_id}
                opponent={prediction.fixture?.opponent ?? 'Unknown'}
                matchDate={prediction.fixture?.match_date ?? prediction.created_at}
                existingPrediction={prediction.prediction as PredictionOutcome}
                isResolved={prediction.is_correct !== null}
                isCorrect={prediction.is_correct}
                credsAwarded={prediction.creds_awarded}
                result={prediction.fixture?.result}
              />
            ))}
          </div>
        </div>
      )}

      {predictions.length === 0 && (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '8px' }}>
          No predictions yet. Vibes only from here on. 👆
        </p>
      )}
    </div>
  );
}
