import { READINESS_FIELDS } from '@/lib/wellness/readiness';
import { average, series, trendLine, type ReadinessDay } from '@/lib/wellness/trend';

const COLOURS = { sleep: '#60A5FA', mood: '#F472B6', soreness: '#FBBF24', stress: '#2DD4BF' } as const;
const W = 640, H = 200, PAD = { l: 28, r: 8, t: 10, b: 22 };

/** The last four weeks of readiness. Gaps are left as gaps. For every scale, higher is better. */
export function TrendChart({ days, rows, today }: { days: string[]; rows: ReadinessDay[]; today: string }) {
  const x = (i: number) => PAD.l + (i / Math.max(1, days.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - 1) / 4) * (H - PAD.t - PAD.b);
  const paths = READINESS_FIELDS.map((f) => {
    const s = series(rows, f.key, days);
    let d = ''; let pen = false;
    s.forEach((v, i) => { if (v === null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `; pen = true; });
    return { f, d, dots: s.map((v, i) => (v === null ? null : [x(i), y(v)] as const)).filter((p): p is readonly [number, number] => p !== null) };
  });
  return (
    <section aria-label="Your readiness over the last four weeks" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20 }}>
      <h2 style={{ marginTop: 0 }}>Your last four weeks</h2>
      {rows.length === 0 ? <p>Your trend will appear here once you have checked in. It is private to you.</p> : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Line chart of sleep, mood, soreness and stress scores from 1 to 5" style={{ width: '100%', height: 'auto' }}>
            {[1, 2, 3, 4, 5].map((v) => <g key={v}><line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.1)" /><text x={4} y={y(v) + 4} fontSize="10" fill="rgba(255,255,255,0.6)">{v}</text></g>)}
            <text x={PAD.l} y={H - 4} fontSize="10" fill="rgba(255,255,255,0.6)">{days[0].slice(5)}</text>
            <text x={W - PAD.r} y={H - 4} fontSize="10" textAnchor="end" fill="rgba(255,255,255,0.6)">{days[days.length - 1].slice(5)}</text>
            {paths.map(({ f, d, dots }) => <g key={f.key}><path d={d} fill="none" stroke={COLOURS[f.key]} strokeWidth="2" />{dots.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="2.5" fill={COLOURS[f.key]} />)}</g>)}
          </svg>
          <ul style={{ display: 'flex', gap: 16, flexWrap: 'wrap', listStyle: 'none', padding: 0, margin: '8px 0' }}>
            {READINESS_FIELDS.map((f) => <li key={f.key}><span aria-hidden style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 999, background: COLOURS[f.key], marginRight: 6 }} />{f.label} · average {average(rows, f.key) ?? '–'}</li>)}
          </ul>
          <p style={{ margin: 0 }}>5 is best on every line: great sleep, good mood, fresh legs, calm head. {trendLine(rows, today)}</p>
        </>
      )}
    </section>
  );
}
