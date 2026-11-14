'use client';

import { COMPONENT_CONFIG, type PulseScoreComponents } from '@/lib/types/pulse-score';

interface ComponentBreakdownProps {
  components: PulseScoreComponents;
}

function getBarColor(pct: number): string {
  if (pct >= 0.7) return '#16a34a';
  if (pct >= 0.4) return '#ca8a04';
  return '#dc2626';
}

export function ComponentBreakdown({ components }: ComponentBreakdownProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {(Object.keys(COMPONENT_CONFIG) as (keyof PulseScoreComponents)[]).map((key) => {
        const config = COMPONENT_CONFIG[key];
        const score = components[key] ?? 0;
        const pct = score / config.maxScore;
        const barColor = getBarColor(pct);

        return (
          <div key={key}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: '6px',
            }}>
              <div>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#fff',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {config.label}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.4)',
                  marginLeft: '8px',
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {config.description}
                </span>
              </div>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color: barColor,
                fontFamily: "'Inter', sans-serif",
                whiteSpace: 'nowrap',
                marginLeft: '12px',
              }}>
                {score} / {config.maxScore}
              </span>
            </div>
            <div style={{
              height: '8px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${pct * 100}%`,
                background: barColor,
                borderRadius: '999px',
                transition: 'width 0.6s ease-out',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
