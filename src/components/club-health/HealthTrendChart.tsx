'use client';

import type { ClubHealthSnapshot } from '@/lib/types/club-health';

interface Props {
  snapshots: ClubHealthSnapshot[];
}

interface SparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

function Sparkline({ values, color, width = 200, height = 48 }: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const polyline = points.join(' ');

  // Area fill
  const areaPath = `M${points[0]} L${points.join(' L')} L${width},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest dot */}
      {(() => {
        const last = points[points.length - 1].split(',');
        return (
          <circle
            cx={last[0]}
            cy={last[1]}
            r="3"
            fill={color}
            stroke="#0B0B0B"
            strokeWidth="2"
          />
        );
      })()}
    </svg>
  );
}

const SPARK_METRICS: {
  key: keyof ClubHealthSnapshot;
  label: string;
  color: string;
  unit?: string;
}[] = [
  { key: 'total_members', label: 'Members', color: '#818cf8' },
  { key: 'avg_availability_rate', label: 'Availability %', color: '#34d399', unit: '%' },
  { key: 'total_scores_earned', label: 'Scores earned', color: '#c9a54c', unit: 'pts' },
  { key: 'fixtures_played', label: 'Fixtures', color: '#60a5fa' },
];

export function HealthTrendChart({ snapshots }: Props) {
  // Sort oldest → newest for left-to-right charts
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.snapshot_month).getTime() - new Date(b.snapshot_month).getTime(),
  );

  if (sorted.length < 2) {
    return (
      <div
        style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '32px', margin: '0 0 12px' }}>📈</p>
        <p
          style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.5)',
            margin: '0 0 4px',
            fontWeight: 500,
          }}
        >
          No trend data yet
        </p>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
          Save your first snapshot to start tracking trends over time.
        </p>
      </div>
    );
  }

  const monthLabels = sorted.map((s) => {
    const d = new Date(s.snapshot_month);
    return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  });

  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px',
        }}
      >
        {SPARK_METRICS.map(({ key, label, color, unit }) => {
          const values = sorted.map((s) => Number(s[key] ?? 0));
          const latest = values[values.length - 1];
          const prev = values[values.length - 2];
          const delta = latest - prev;
          const deltaSign = delta > 0 ? '+' : '';

          return (
            <div key={key}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.7px',
                    color: 'rgba(255,255,255,0.35)',
                    fontWeight: 600,
                  }}
                >
                  {label}
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                  <span
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      fontWeight: 700,
                      fontSize: '18px',
                      color: '#fff',
                    }}
                  >
                    {latest.toLocaleString()}
                    {unit && (
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                        {unit}
                      </span>
                    )}
                  </span>
                  {delta !== 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: delta > 0 ? '#34d399' : '#f87171',
                        fontWeight: 600,
                      }}
                    >
                      {deltaSign}{delta.toFixed(key === 'avg_availability_rate' ? 1 : 0)}
                    </span>
                  )}
                </div>
              </div>
              <Sparkline values={values} color={color} width={240} height={44} />
              {/* Month labels */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '4px',
                }}
              >
                {monthLabels.map((m, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '9px',
                      color: 'rgba(255,255,255,0.2)',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
