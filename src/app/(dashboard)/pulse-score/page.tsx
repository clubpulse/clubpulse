import { requireUser } from '@/lib/auth/server';
import { getLatestPulseScore, getPulseHistory, getClubIdForUser } from '@/lib/actions/pulse-score';
import { getPulseRating, COMPONENT_CONFIG, type PulseScoreComponents } from '@/lib/types/pulse-score';
import { PulseScoreDisplay } from '@/components/pulse/PulseScoreDisplay';
import { ComponentBreakdown } from '@/components/pulse/ComponentBreakdown';
import { RecalculateButton } from '@/components/pulse/RecalculateButton';

// Simple 8-week trend line rendered as inline SVG (server-side, no JS needed)
function TrendLine({ history }: { history: { score: number; snapshot_week: string }[] }) {
  if (history.length < 2) {
    return (
      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', margin: 0, fontFamily: "'Inter', sans-serif" }}>
        Not enough history to show a trend yet.
      </p>
    );
  }

  const w = 400;
  const h = 80;
  const pad = 8;
  const scores = history.map((h) => h.score);
  const minS = Math.max(0, Math.min(...scores) - 5);
  const maxS = Math.min(100, Math.max(...scores) + 5);

  const xStep = (w - pad * 2) / (scores.length - 1);
  const yScale = (s: number) => h - pad - ((s - minS) / (maxS - minS || 1)) * (h - pad * 2);

  const points = scores.map((s, i) => `${pad + i * xStep},${yScale(s)}`).join(' ');

  return (
    <div>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        8-Week Trend
      </h3>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => (
          <line
            key={v}
            x1={pad} y1={yScale(v)} x2={w - pad} y2={yScale(v)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="1"
          />
        ))}
        {/* Gradient fill */}
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9b1c1c" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#9b1c1c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          points={`${pad + 0 * xStep},${h - pad} ${points} ${pad + (scores.length - 1) * xStep},${h - pad}`}
          fill="url(#trendFill)"
          stroke="none"
        />
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Data points */}
        {scores.map((s, i) => (
          <circle
            key={i}
            cx={pad + i * xStep}
            cy={yScale(s)}
            r="3"
            fill="#ef4444"
            stroke="rgba(0,0,0,0.6)"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      {/* Week labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
        {history.map((item, i) => (
          <span key={i} style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" }}>
            {new Date(item.snapshot_week).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        ))}
      </div>
    </div>
  );
}

function ImprovementTips({ components }: { components: PulseScoreComponents }) {
  const tips: string[] = [];

  if ((components.availability / COMPONENT_CONFIG.availability.maxScore) < 0.6)
    tips.push('Encourage players to submit fixture availability early — it\'s worth up to 25 points.');
  if ((components.scores_activity / COMPONENT_CONFIG.scores_activity.maxScore) < 0.5)
    tips.push('Get more members earning and spending Scores to boost the activity component.');
  if ((components.mentor / COMPONENT_CONFIG.mentor.maxScore) < 0.5)
    tips.push('Set up mentoring pairs — each session adds 3 points to Mentoring.');
  if ((components.volunteer / COMPONENT_CONFIG.volunteer.maxScore) < 0.5)
    tips.push('Log volunteer sessions regularly — coaching, grounds, admin all count.');
  if ((components.community / COMPONENT_CONFIG.community.maxScore) < 0.5)
    tips.push('Use the Community Pot or Raffle features to drive community engagement points.');
  if ((components.fixture / COMPONENT_CONFIG.fixture.maxScore) < 0.7)
    tips.push('Make sure match scorecards are submitted promptly so fixtures show as completed.');

  if (tips.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: 0, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Tips to Improve
      </h3>
      <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {tips.map((tip, i) => (
          <li key={i} style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.07)',
  padding: '24px',
};

export default async function PulseScorePage() {
  await requireUser();

  const clubId = await getClubIdForUser();

  if (!clubId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: 0 }}>
          💓 Club Pulse Score
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', margin: 0 }}>You are not a member of any club yet.</p>
      </div>
    );
  }

  const [latestResult, historyResult] = await Promise.all([
    getLatestPulseScore(clubId),
    getPulseHistory(clubId, 8),
  ]);

  const hasScore = latestResult.success && latestResult.data;
  const latest = hasScore ? latestResult.data : null;
  const history = historyResult.success ? historyResult.data : [];

  const defaultComponents: PulseScoreComponents = {
    scores_activity: 0, availability: 0, mentor: 0,
    community: 0, volunteer: 0, fixture: 0,
  };
  const components = latest?.component_scores ?? defaultComponents;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
            💓 Club Pulse Score
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            How active and engaged your club is this week
          </p>
        </div>
        {latest && (
          <RecalculateButton clubId={clubId} lastCalculatedAt={latest.calculated_at} />
        )}
      </div>

      {/* Main score + breakdown */}
      {latest ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Score ring + rating */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>
            <PulseScoreDisplay score={latest.score} />
            <div style={{
              display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center',
            }}>
              {(['Dormant','Quiet','Steady','Active','Thriving'] as const).map((r) => {
                const thresholds: Record<string, string> = { Dormant: '<20', Quiet: '20–39', Steady: '40–59', Active: '60–79', Thriving: '80+' };
                const emojis: Record<string, string> = { Dormant: '🔴', Quiet: '🟠', Steady: '🟡', Active: '🔵', Thriving: '🟢' };
                const isActive = getPulseRating(latest.score) === r;
                return (
                  <span key={r} style={{
                    fontSize: '0.75rem',
                    fontFamily: "'Inter', sans-serif",
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.25)',
                    fontWeight: isActive ? 700 : 400,
                  }}>
                    {emojis[r]} {r} ({thresholds[r]})
                  </span>
                );
              })}
            </div>
          </div>

          {/* Component breakdown */}
          <div style={card}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: '0 0 18px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Score Breakdown
            </h3>
            <ComponentBreakdown components={components} />
          </div>

          {/* Trend */}
          {history.length > 0 && (
            <div style={card}>
              <TrendLine history={history} />
            </div>
          )}

          {/* Tips */}
          <div style={card}>
            <ImprovementTips components={components} />
          </div>
        </div>
      ) : (
        /* No score yet — prompt to calculate */
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center', padding: '48px 24px' }}>
          <span style={{ fontSize: '3rem' }}>💓</span>
          <div>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0 0 6px', fontFamily: "'Syne', sans-serif" }}>
              No Pulse Score yet
            </p>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              Calculate your club's first Pulse Score to see how active and engaged you are.
            </p>
          </div>
          <RecalculateButton clubId={clubId} lastCalculatedAt={new Date().toISOString()} />
        </div>
      )}
    </div>
  );
}
