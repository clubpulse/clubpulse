'use client';

import { useMemo } from 'react';
import type { ClubMilestone } from '@/lib/types/club-bible';
import { MILESTONE_CATEGORY_CONFIG } from '@/lib/types/club-bible';

interface Props {
  milestones: ClubMilestone[];
}

export function MilestoneTimeline({ milestones }: Props) {
  // Sort ascending for display (oldest first)
  const sorted = useMemo(
    () => [...milestones].sort((a: ClubMilestone, b: ClubMilestone) => a.year - b.year),
    [milestones]
  );

  if (sorted.length === 0) {
    return (
      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif", textAlign: 'center', padding: '32px 0' }}>
        No milestones yet — admins can add them via the Club Admin panel.
      </p>
    );
  }

  // Group by decade for decade markers
  const decadeOf = (year: number) => Math.floor(year / 10) * 10;

  let lastDecade: number | null = null;

  return (
    <div style={{ position: 'relative', fontFamily: "'Inter', sans-serif" }}>
      {/* Vertical rail */}
      <div style={{
        position: 'absolute',
        left: '28px',
        top: 0,
        bottom: 0,
        width: '2px',
        background: 'rgba(255,255,255,0.07)',
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {sorted.map((m: ClubMilestone) => {
          const decade = decadeOf(m.year);
          const showDecadeMarker = decade !== lastDecade;
          lastDecade = decade;
          const config = MILESTONE_CATEGORY_CONFIG[m.category];
          const isFeatured = m.is_featured;

          return (
            <div key={m.id}>
              {showDecadeMarker && (
                <div
                  id={`decade-${decade}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '24px 0 8px',
                    scrollMarginTop: '80px',
                  }}
                >
                  <div style={{
                    width: '58px',
                    textAlign: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.25)',
                  }}>
                    {decade}s
                  </div>
                  <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
                </div>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                padding: isFeatured ? '14px 0' : '10px 0',
                transition: 'opacity 0.15s',
              }}>
                {/* Category emoji badge on the rail */}
                <div style={{
                  width: '58px',
                  flexShrink: 0,
                  display: 'flex',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    width: isFeatured ? '36px' : '28px',
                    height: isFeatured ? '36px' : '28px',
                    borderRadius: '50%',
                    background: isFeatured ? 'rgba(155,28,28,0.25)' : '#141414',
                    border: `1px solid ${isFeatured ? 'rgba(155,28,28,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isFeatured ? '16px' : '13px',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                  }}>
                    {config.emoji}
                  </div>
                </div>

                {/* Content */}
                <div style={{
                  flex: 1,
                  background: isFeatured ? 'rgba(155,28,28,0.06)' : 'transparent',
                  border: `1px solid ${isFeatured ? 'rgba(155,28,28,0.2)' : 'transparent'}`,
                  borderRadius: isFeatured ? '12px' : '0',
                  padding: isFeatured ? '12px 14px' : '2px 0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.35)',
                      letterSpacing: '0.5px',
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {m.year}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.2)',
                      background: 'rgba(255,255,255,0.06)',
                      padding: '1px 6px',
                      borderRadius: '20px',
                    }}>
                      {config.label}
                    </span>
                    {isFeatured && (
                      <span style={{ fontSize: '10px', color: '#e2725b', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                        Featured
                      </span>
                    )}
                  </div>
                  <p style={{
                    margin: '0 0 4px',
                    fontSize: isFeatured ? '15px' : '13px',
                    fontWeight: isFeatured ? 600 : 500,
                    color: '#fff',
                    lineHeight: 1.4,
                  }}>
                    {m.title}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.45)',
                    lineHeight: 1.5,
                  }}>
                    {m.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
