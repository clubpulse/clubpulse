import { Metadata } from 'next';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export const metadata: Metadata = {
  title: 'Coaching History | ClubPulse',
  description: 'Track your AI coaching progress over time — metric trends, session logs, and season targets.',
};

const metrics = [
  {
    label: 'Elbow alignment',
    color: '#2ecc71',
    values: [61, 63, 65, 63, 67, 69, 71, 74],
    current: 74,
    change: +13,
    trend: 'up',
    note: null,
  },
  {
    label: 'Head position',
    color: '#e74c3c',
    values: [82, 83, 81, 82, 80, 80, 79, 79],
    current: 79,
    change: -3,
    trend: 'down',
    note: 'Needs focus',
  },
  {
    label: 'Stance balance',
    color: '#f1c40f',
    values: [72, 74, 75, 77, 79, 82, 85, 88],
    current: 88,
    change: +16,
    trend: 'up',
    note: '🏆 Best metric',
  },
];

const sessions = [
  { num: 10, date: '23 Oct 2026', shots: 48, score: 74, notes: 'Elbow drill focus' },
  { num: 9, date: '16 Oct 2026', shots: 52, score: 71, notes: 'Full session — off drive' },
  { num: 8, date: '9 Oct 2026', shots: 39, score: 68, notes: 'Short session — footwork' },
  { num: 7, date: '2 Oct 2026', shots: 55, score: 65, notes: 'Cut & pull shots' },
  { num: 6, date: '25 Sep 2026', shots: 44, score: 63, notes: 'Stance corrections' },
];

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 120;
  const h = 40;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x},${y}`;
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
        return <circle key={i} cx={x} cy={y} r={i === values.length - 1 ? 4 : 2} fill={color} opacity={i === values.length - 1 ? 1 : 0.4} />;
      })}
    </svg>
  );
}

export default function CoachingHistoryPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '26px', color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>
              Progress Over Time
            </h1>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(249,115,22,0.12)', color: '#f97316', border: '1px solid rgba(249,115,22,0.25)', borderRadius: '6px', padding: '3px 8px' }}>
              Roadmap
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            10 AI sessions · Season 2026 · Batting
          </p>
        </div>
        <button style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          Export Season Report
        </button>
      </div>

      {/* Metric sparklines */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {metrics.map((m) => (
          <Card key={m.label}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '4px' }}>{m.label}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>{m.current}%</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: m.trend === 'up' ? '#2ecc71' : '#e74c3c' }}>
                    {m.trend === 'up' ? '↑' : '↓'}{Math.abs(m.change)}%
                  </span>
                </div>
              </div>
              {m.note && (
                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', background: m.trend === 'up' ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)', color: m.trend === 'up' ? '#2ecc71' : '#e74c3c', border: `1px solid ${m.trend === 'up' ? 'rgba(46,204,113,0.2)' : 'rgba(231,76,60,0.2)'}`, fontWeight: 600 }}>
                  {m.note}
                </span>
              )}
            </div>
            <Sparkline values={m.values} color={m.color} />
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>Sessions 1–10 · {m.values[0]}% → {m.values[m.values.length - 1]}%</p>
          </Card>
        ))}
      </div>

      {/* Session log */}
      <Card title="Session Log">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {sessions.map((s, i) => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 0', borderBottom: i < sessions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(155,28,28,0.15)', border: '1px solid rgba(155,28,28,0.25)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#c9a54c', fontFamily: "'Syne', sans-serif" }}>{s.num}</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{s.notes}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{s.date} · {s.shots} shots</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>{s.score}%</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>avg score</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Next target */}
      <div style={{ background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.15)', borderRadius: '16px', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#2ecc71', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Next session target</p>
          <p style={{ fontSize: '16px', color: '#fff', fontWeight: 600 }}>Head position → 82% · Keep elbow alignment above 72%</p>
        </div>
        <a href="/analyse" style={{ padding: '10px 20px', background: '#9b1c1c', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Start session →
        </a>
      </div>

      {/* Coming soon banner */}
      <div style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.12)', borderRadius: '12px', padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '20px', flexShrink: 0 }}>🚧</span>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#f97316', marginBottom: '4px' }}>Full coaching history is on the roadmap</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
            The data above is a preview of the coaching history feature. Full trend tracking, session comparisons, and season exports are being built now. Currently you can view individual session highlights under{' '}
            <a href="/highlights" style={{ color: '#f97316', textDecoration: 'none' }}>Highlights</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
