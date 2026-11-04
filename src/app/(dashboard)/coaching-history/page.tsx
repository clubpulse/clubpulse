import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Coaching History | ClubPulse',
  description: 'Track your AI coaching progress over time — session logs, speed trends, and coaching insights.',
};

// ── Types ───────────────────────────────────────────────────────────────────

type BallResultJson = {
  speed_kph?: number | null;
  swing_px?: number | null;
  bounce_frame?: number | null;
  frames_processed?: number;
};

type PoseResultJson = {
  bat_lift?: number | null;
  balance?: number | null;
  follow_through?: number | null;
};

type AnalysisRow = {
  id: string;
  created_at: string;
  analysis_type: 'ball' | 'pose';
  result_json: BallResultJson | PoseResultJson;
  coaching_paragraph: string | null;
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 120;
  const h = 36;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
      />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / range) * (h - 6) - 3;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === values.length - 1 ? 4 : 2}
            fill={color}
            opacity={i === values.length - 1 ? 1 : 0.4}
          />
        );
      })}
    </svg>
  );
}

function StatBadge({ label, value, unit, color }: { label: string; value: number | null | undefined; unit: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: '20px', fontWeight: 800, color, fontFamily: "'Syne', sans-serif" }}>
        {value != null ? `${typeof value === 'number' ? value.toFixed(1) : value}${unit}` : '—'}
      </span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CoachingHistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rows } = await supabase
    .from('analysis_results')
    .select('id, created_at, analysis_type, result_json, coaching_paragraph')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const sessions: AnalysisRow[] = (rows ?? []) as AnalysisRow[];
  const ballSessions = sessions.filter(s => s.analysis_type === 'ball');
  const poseSessions = sessions.filter(s => s.analysis_type === 'pose');

  // Build sparkline data from ball sessions (oldest→newest)
  const ballChron = [...ballSessions].reverse();
  const speedValues = ballChron.map(s => (s.result_json as BallResultJson).speed_kph ?? 0).filter(Boolean);
  const swingValues = ballChron.map(s => (s.result_json as BallResultJson).swing_px ?? 0).filter(Boolean);

  const poseChron = [...poseSessions].reverse();
  const batLiftValues = poseChron.map(s => (s.result_json as PoseResultJson).bat_lift ?? 0).filter(Boolean);
  const balanceValues = poseChron.map(s => (s.result_json as PoseResultJson).balance ?? 0).filter(Boolean);

  const latestSpeed = speedValues.at(-1);
  const latestSwing = swingValues.at(-1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '26px', color: '#fff', margin: 0, letterSpacing: '-0.3px', marginBottom: '6px' }}>
            Coaching History
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} · {ballSessions.length} ball-track · {poseSessions.length} pose
          </p>
        </div>
        <a
          href="/analyse"
          style={{ padding: '10px 20px', background: '#2563EB', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          New session →
        </a>
      </div>

      {sessions.length === 0 ? (
        /* Empty state */
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏏</div>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>No sessions yet</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>
              Run your first ball-track or pose analysis to start building your coaching history.
            </p>
            <a
              href="/analyse"
              style={{ display: 'inline-block', padding: '12px 24px', background: '#2563EB', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, textDecoration: 'none' }}
            >
              Start analysing →
            </a>
          </div>
        </Card>
      ) : (
        <>
          {/* Trend cards */}
          {(speedValues.length >= 2 || balanceValues.length >= 2) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {speedValues.length >= 2 && (
                <Card>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '4px' }}>Ball Speed</p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '30px', fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
                          {latestSpeed?.toFixed(1)}
                        </span>
                        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>km/h</span>
                        {speedValues.length >= 2 && (
                          <span style={{ fontSize: '13px', fontWeight: 600, color: (speedValues.at(-1)! > speedValues[0]) ? '#2ecc71' : '#e74c3c' }}>
                            {speedValues.at(-1)! > speedValues[0] ? '↑' : '↓'}{Math.abs(speedValues.at(-1)! - speedValues[0]).toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Sparkline values={speedValues} color="#60A5FA" />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
                    {speedValues.length} ball-track sessions
                  </p>
                </Card>
              )}

              {swingValues.length >= 2 && (
                <Card>
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '4px' }}>Swing Movement</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '30px', fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
                        {latestSwing?.toFixed(1)}
                      </span>
                      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>px</span>
                    </div>
                  </div>
                  <Sparkline values={swingValues} color="#EFC84A" />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
                    Lateral deviation trend
                  </p>
                </Card>
              )}

              {balanceValues.length >= 2 && (
                <Card>
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '4px' }}>Batting Balance</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '30px', fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
                        {balanceValues.at(-1)?.toFixed(0)}
                      </span>
                      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>/ 100</span>
                    </div>
                  </div>
                  <Sparkline values={balanceValues} color="#2ecc71" />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
                    {balanceValues.length} pose sessions
                  </p>
                </Card>
              )}

              {batLiftValues.length >= 2 && (
                <Card>
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '4px' }}>Bat Lift</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '30px', fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
                        {batLiftValues.at(-1)?.toFixed(0)}
                      </span>
                      <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>/ 100</span>
                    </div>
                  </div>
                  <Sparkline values={batLiftValues} color="#f97316" />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
                    Backswing quality trend
                  </p>
                </Card>
              )}
            </div>
          )}

          {/* Session log */}
          <Card title="Session Log">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {sessions.map((s, i) => {
                const isBall = s.analysis_type === 'ball';
                const ball = s.result_json as BallResultJson;
                const pose = s.result_json as PoseResultJson;
                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '16px 0',
                      borderBottom: i < sessions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Type badge */}
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isBall ? 'rgba(96,165,250,0.12)' : 'rgba(46,204,113,0.12)',
                      border: `1px solid ${isBall ? 'rgba(96,165,250,0.25)' : 'rgba(46,204,113,0.25)'}`,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      fontSize: '16px',
                    }}>
                      {isBall ? '🎯' : '🏏'}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
                          {isBall ? 'Ball-Track Analysis' : 'Pose Analysis'}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '5px',
                          background: isBall ? 'rgba(96,165,250,0.12)' : 'rgba(46,204,113,0.12)',
                          color: isBall ? '#60A5FA' : '#2ecc71',
                        }}>
                          {isBall ? 'Ball' : 'Pose'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{formatDate(s.created_at)}</span>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: '24px', marginBottom: s.coaching_paragraph ? '10px' : 0, flexWrap: 'wrap' }}>
                        {isBall ? (
                          <>
                            <StatBadge label="Speed" value={ball.speed_kph} unit=" km/h" color="#60A5FA" />
                            <StatBadge label="Swing" value={ball.swing_px} unit=" px" color="#EFC84A" />
                          </>
                        ) : (
                          <>
                            <StatBadge label="Bat Lift" value={pose.bat_lift} unit="" color="#f97316" />
                            <StatBadge label="Balance" value={pose.balance} unit="" color="#2ecc71" />
                            <StatBadge label="Follow-through" value={pose.follow_through} unit="" color="#60A5FA" />
                          </>
                        )}
                      </div>

                      {/* Coaching paragraph */}
                      {s.coaching_paragraph && (
                        <div style={{
                          background: 'rgba(37,99,235,0.07)',
                          border: '1px solid rgba(37,99,235,0.15)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          marginTop: '8px',
                        }}>
                          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, margin: 0 }}>
                            💬 {s.coaching_paragraph}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
