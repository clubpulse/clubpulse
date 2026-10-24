'use client';

import type { FormRating, FormTrend } from '@/lib/types/form';

const TREND_CONFIG: Record<FormTrend, { arrow: string; color: string; label: string; pulse: boolean }> = {
  rising:  { arrow: '↑', color: '#22c55e', label: 'RISING',  pulse: true  },
  falling: { arrow: '↓', color: '#ef4444', label: 'FALLING', pulse: false },
  steady:  { arrow: '→', color: '#6b7280', label: 'STEADY',  pulse: false },
};

function Sparkline({ scores }: { scores: number[] }) {
  if (!scores.length) {
    return (
      <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '28px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '10px',
              height: '8px',
              borderRadius: '2px',
              background: 'rgba(255,255,255,0.08)',
            }}
          />
        ))}
      </div>
    );
  }

  const max = Math.max(...scores, 1);
  const bars = Array.from({ length: 5 }).map((_, i) => scores[i] ?? 0);

  function barColor(val: number): string {
    if (val >= 50) return '#22c55e';
    if (val >= 25) return '#c9a84c';
    if (val > 0)   return '#ef4444';
    return 'rgba(255,255,255,0.12)';
  }

  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '28px' }} title="Last 5 innings">
      {bars.map((val, i) => {
        const heightPct = val > 0 ? Math.max(0.15, val / max) : 0.08;
        return (
          <div
            key={i}
            title={val > 0 ? `${val} runs` : 'DNS / 0'}
            style={{
              width: '10px',
              height: `${Math.round(heightPct * 28)}px`,
              borderRadius: '2px',
              background: barColor(val),
              transition: 'height 0.3s ease',
              flexShrink: 0,
            }}
          />
        );
      })}
    </div>
  );
}

interface FormTickerProps {
  form: FormRating | null;
}

export function FormTicker({ form }: FormTickerProps) {
  const trend = form?.trend ?? 'steady';
  const cfg   = TREND_CONFIG[trend];
  const rating = form?.rating ?? null;

  return (
    <div
      style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <p
        style={{
          margin: 0,
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.35)',
          fontFamily: "'Syne', sans-serif",
        }}
      >
        Form
      </p>

      {/* Rating row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Big number */}
        <span
          style={{
            fontSize: '48px',
            fontWeight: 800,
            letterSpacing: '-2px',
            color: rating !== null ? cfg.color : 'rgba(255,255,255,0.2)',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
            fontFamily: "'Syne', sans-serif",
          }}
        >
          {rating !== null ? rating.toFixed(1) : '--'}
        </span>

        {/* Trend badge */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span
            style={{
              fontSize: '28px',
              color: cfg.color,
              lineHeight: 1,
              ...(cfg.pulse ? { animation: 'formPulse 1.8s ease-in-out infinite' } : {}),
            }}
          >
            {cfg.arrow}
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: cfg.color,
              opacity: 0.8,
            }}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div>
        <p style={{ margin: '0 0 6px', fontSize: '10px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Last 5 innings
        </p>
        <Sparkline scores={form?.last_5_scores ?? []} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
          {form ? `${form.matches_played} match${form.matches_played !== 1 ? 'es' : ''}` : 'No data yet'}
        </span>
        {form && (
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>
            Updated {new Date(form.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>

      <style>{`
        @keyframes formPulse {
          0%, 100% { opacity: 1; transform: translateY(0); }
          50%       { opacity: 0.6; transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}
