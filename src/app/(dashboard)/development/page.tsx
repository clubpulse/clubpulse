/**
 * Predictive Development Tracking
 * -----------------------------------
 * Fetches the user's last N analysis sessions from Supabase, runs a simple
 * linear-regression trajectory model on each metric, and projects where the
 * player is heading over the next 5 sessions.
 *
 * All maths happens server-side — no client bundle weight.
 */

import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Development Tracking | ClubPulse',
  description: 'See where your cricket skills are heading based on your analysis sessions.',
};

// ── Types ────────────────────────────────────────────────────────────────────

type BallJson = {
  speed_kph?: number | null;
  swing_px?:  number | null;
};

type PoseJson = {
  overall?:   number | null;
  mode?:      string;
  metrics?:   Array<{ key: string; label: string; score: number }>;
};

type AnalysisRow = {
  id:                 string;
  created_at:         string;
  analysis_type:      'ball' | 'pose';
  result_json:        BallJson | PoseJson;
  coaching_paragraph: string | null;
};

// ── Linear regression ────────────────────────────────────────────────────────

function linearRegression(ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const xs = ys.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    num  += (xs[i] - meanX) * (ys[i] - meanY);
    denX += (xs[i] - meanX) ** 2;
    denY += (ys[i] - meanY) ** 2;
  }
  const slope     = denX === 0 ? 0 : num / denX;
  const intercept = meanY - slope * meanX;
  const r2        = (denX === 0 || denY === 0) ? 0 : (num / Math.sqrt(denX * denY)) ** 2;
  return { slope, intercept, r2 };
}

function project(reg: ReturnType<typeof linearRegression>, stepsAhead: number, currentN: number): number {
  return reg.intercept + reg.slope * (currentN - 1 + stepsAhead);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function trendIcon(slope: number) {
  if (slope > 0.5) return '↑';
  if (slope < -0.5) return '↓';
  return '→';
}

function trendColor(slope: number, higherIsBetter: boolean) {
  if (Math.abs(slope) < 0.5) return 'rgba(255,255,255,0.4)';
  const improving = higherIsBetter ? slope > 0 : slope < 0;
  return improving ? '#2ecc71' : '#e74c3c';
}

// ── Sparkline (SVG, server-renderable) ──────────────────────────────────────

function Sparkline({ values, color, projected }: { values: number[]; color: string; projected?: number }) {
  const all = projected != null ? [...values, projected] : values;
  if (all.length < 2) return null;
  const max = Math.max(...all);
  const min = Math.min(...all);
  const range = max - min || 1;
  const w = 160, h = 44;
  const pt = (v: number, i: number) => {
    const x = (i / (all.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return { x, y };
  };
  const pts = all.map((v, i) => pt(v, i));
  const solidPts = pts.slice(0, values.length);
  const solidPath = solidPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      {/* Solid historical line */}
      <path d={solidPath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}66)` }} />

      {/* Dashed projected segment */}
      {projected != null && solidPts.length >= 1 && (() => {
        const last = solidPts[solidPts.length - 1];
        const proj = pt(projected, all.length - 1);
        return (
          <line x1={last.x.toFixed(1)} y1={last.y.toFixed(1)} x2={proj.x.toFixed(1)} y2={proj.y.toFixed(1)}
            stroke={color} strokeWidth="1.5" strokeDasharray="4 3" opacity={0.55} />
        );
      })()}

      {/* Historical dots */}
      {solidPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === solidPts.length - 1 ? 4 : 2.5}
          fill={color} opacity={i === solidPts.length - 1 ? 1 : 0.5} />
      ))}

      {/* Projected dot */}
      {projected != null && (() => {
        const p = pt(projected, all.length - 1);
        return <circle cx={p.x} cy={p.y} r={3.5} fill="none" stroke={color} strokeWidth="1.5" opacity={0.6} />;
      })()}
    </svg>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({
  label, values, projected, unit, color, higherIsBetter, reg,
}: {
  label:          string;
  values:         number[];
  projected:      number;
  unit:           string;
  color:          string;
  higherIsBetter: boolean;
  reg:            ReturnType<typeof linearRegression>;
}) {
  const current = values.at(-1) ?? 0;
  const delta   = projected - current;
  const tc      = trendColor(reg.slope, higherIsBetter);
  const icon    = trendIcon(reg.slope);
  const confidence = Math.round(reg.r2 * 100);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '14px',
      padding: '20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '4px' }}>{label}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
              {current.toFixed(1)}{unit}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: tc, fontFamily: "'Syne', sans-serif" }}>{icon}</div>
          <div style={{ fontSize: '12px', color: tc, fontWeight: 600 }}>
            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}{unit} projected
          </div>
        </div>
      </div>

      <Sparkline values={values} color={color} projected={projected} />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          {values.length} session{values.length !== 1 ? 's' : ''} · {confidence}% fit
        </span>
        <span style={{ fontSize: '11px', color, fontWeight: 600 }}>
          → {projected.toFixed(1)}{unit} in 5
        </span>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DevelopmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: rows } = await supabase
    .from('analysis_results')
    .select('id, created_at, analysis_type, result_json, coaching_paragraph')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50);

  const sessions: AnalysisRow[] = (rows ?? []) as AnalysisRow[];
  const ballSessions = sessions.filter(s => s.analysis_type === 'ball');
  const poseSessions = sessions.filter(s => s.analysis_type === 'pose');

  // Extract metric series
  const speeds  = ballSessions.map(s => (s.result_json as BallJson).speed_kph).filter((v): v is number => v != null);
  const swings  = ballSessions.map(s => Math.abs((s.result_json as BallJson).swing_px ?? 0));
  const overall = poseSessions.map(s => (s.result_json as PoseJson).overall).filter((v): v is number => v != null);

  // Per-metric breakdown from pose sessions (take the most common set)
  const poseMetricKeys: string[] = [];
  const poseMetricData: Record<string, number[]> = {};
  for (const s of poseSessions) {
    const metrics = (s.result_json as PoseJson).metrics ?? [];
    for (const m of metrics) {
      if (!poseMetricData[m.key]) { poseMetricData[m.key] = []; poseMetricKeys.push(m.key); }
      poseMetricData[m.key].push(m.score);
    }
  }

  // Build regression for each series
  const speedReg   = linearRegression(speeds);
  const swingReg   = linearRegression(swings);
  const overallReg = linearRegression(overall);

  const speedProj   = clamp(project(speedReg,   5, speeds.length),  0, 300);
  const swingProj   = clamp(project(swingReg,   5, swings.length),  0, 500);
  const overallProj = clamp(project(overallReg, 5, overall.length), 0, 100);

  const hasEnoughBall = speeds.length >= 2;
  const hasEnoughPose = overall.length >= 2;
  const hasAnyData    = sessions.length > 0;

  // Most recent coaching paragraphs for each type
  const latestBallCoaching = [...ballSessions].reverse().find(s => s.coaching_paragraph)?.coaching_paragraph;
  const latestPoseCoaching = [...poseSessions].reverse().find(s => s.coaching_paragraph)?.coaching_paragraph;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '26px', color: '#fff', margin: 0, letterSpacing: '-0.3px', marginBottom: '6px' }}>
          Development Tracking
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          Based on your last {sessions.length} session{sessions.length !== 1 ? 's' : ''} — where your game is heading.
        </p>
      </div>

      {!hasAnyData ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
            <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>No data yet</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>
              Run at least two analysis sessions to unlock your development trajectory.
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
          {/* Trajectory explanation */}
          <div style={{
            background: 'rgba(37,99,235,0.07)',
            border: '1px solid rgba(37,99,235,0.15)',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: '18px', flexShrink: 0 }}>📐</span>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
              Projections use linear regression on your session history. The dashed line shows where
              each metric is trending over your next 5 sessions if the current rate continues.
              The fit % shows how consistent the trend is — higher means more reliable.
            </p>
          </div>

          {/* Ball-track trajectory */}
          {hasEnoughBall ? (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                🏏 Bowling — Ball Tracking
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <MetricCard
                  label="Delivery Speed"
                  values={speeds}
                  projected={speedProj}
                  unit=" km/h"
                  color="#60A5FA"
                  higherIsBetter={true}
                  reg={speedReg}
                />
                {swings.length >= 2 && (
                  <MetricCard
                    label="Swing Movement"
                    values={swings}
                    projected={swingProj}
                    unit=" px"
                    color="#EFC84A"
                    higherIsBetter={true}
                    reg={swingReg}
                  />
                )}
              </div>

              {latestBallCoaching && (
                <div style={{
                  marginTop: '16px',
                  background: 'rgba(96,165,250,0.06)',
                  border: '1px solid rgba(96,165,250,0.15)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                    Latest coaching insight — bowling
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
                    {latestBallCoaching}
                  </p>
                </div>
              )}
            </div>
          ) : ballSessions.length > 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
                Complete {2 - ballSessions.length} more ball-track session{ballSessions.length === 1 ? '' : 's'} to unlock bowling trajectory.
              </p>
            </div>
          ) : null}

          {/* Pose trajectory */}
          {hasEnoughPose ? (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                🧍 Technique — Pose Analysis
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <MetricCard
                  label="Overall Technique Score"
                  values={overall}
                  projected={overallProj}
                  unit="/100"
                  color="#2ecc71"
                  higherIsBetter={true}
                  reg={overallReg}
                />
                {Object.entries(poseMetricData).filter(([, vals]) => vals.length >= 2).map(([key, vals]) => {
                  const reg = linearRegression(vals);
                  const proj = clamp(project(reg, 5, vals.length), 0, 100);
                  const label = poseSessions
                    .flatMap(s => (s.result_json as PoseJson).metrics ?? [])
                    .find(m => m.key === key)?.label ?? key;
                  return (
                    <MetricCard
                      key={key}
                      label={label}
                      values={vals}
                      projected={proj}
                      unit="/100"
                      color="#f97316"
                      higherIsBetter={true}
                      reg={reg}
                    />
                  );
                })}
              </div>

              {latestPoseCoaching && (
                <div style={{
                  marginTop: '16px',
                  background: 'rgba(46,204,113,0.06)',
                  border: '1px solid rgba(46,204,113,0.15)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                }}>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#2ecc71', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>
                    Latest coaching insight — technique
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>
                    {latestPoseCoaching}
                  </p>
                </div>
              )}
            </div>
          ) : poseSessions.length > 0 ? (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
                Complete {2 - poseSessions.length} more pose session{poseSessions.length === 1 ? '' : 's'} to unlock technique trajectory.
              </p>
            </div>
          ) : null}

          {/* Session timeline */}
          <Card title="Session Timeline">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[...sessions].reverse().slice(0, 10).map((s, i, arr) => {
                const isBall = s.analysis_type === 'ball';
                const ball = s.result_json as BallJson;
                const pose = s.result_json as PoseJson;
                return (
                  <div key={s.id} style={{
                    display: 'flex', gap: '12px', padding: '12px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    alignItems: 'center',
                  }}>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                      background: isBall ? 'rgba(96,165,250,0.12)' : 'rgba(46,204,113,0.12)',
                      display: 'grid', placeItems: 'center', fontSize: '14px',
                    }}>
                      {isBall ? '🎯' : '🏏'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                        {isBall ? 'Ball Track' : 'Pose Analysis'}
                      </span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginLeft: '8px' }}>
                        {formatDate(s.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: isBall ? '#60A5FA' : '#2ecc71', textAlign: 'right' }}>
                      {isBall
                        ? (ball.speed_kph != null ? `${ball.speed_kph} km/h` : '—')
                        : (pose.overall != null ? `${pose.overall}/100` : '—')}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* CTA */}
          <div style={{
            background: 'rgba(37,99,235,0.08)',
            border: '1px solid rgba(37,99,235,0.18)',
            borderRadius: '14px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#60A5FA', marginBottom: '4px' }}>
                Want personalised guidance on these trends?
              </p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>
                Your AI Coach can explain what your trajectory means and what to work on next.
              </p>
            </div>
            <a
              href="/companion"
              style={{ padding: '10px 20px', background: '#2563EB', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Chat with your coach →
            </a>
          </div>
        </>
      )}
    </div>
  );
}
