'use client';

import { BENEFIT_TYPE_CONFIG, AGE_GROUP_LABELS } from '@/lib/types/sponsor';
import type { Sponsorship } from '@/lib/types/sponsor';

interface MySponsorshipsProps {
  sponsorships: Sponsorship[];
}

const STATUS_CONFIG = {
  active: {
    label: 'Active — Awaiting fulfilment by admin',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.2)',
  },
  fulfilled: {
    label: 'Fulfilled ✅ — This junior has received their benefit',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    border: 'rgba(74,222,128,0.2)',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'rgba(255,255,255,0.3)',
    bg: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
  },
};

export function MySponsorships({ sponsorships }: MySponsorshipsProps) {
  if (sponsorships.length === 0) {
    return (
      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '32px 20px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '28px', margin: '0 0 8px' }}>💝</p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          You haven&apos;t sponsored anyone yet — be the first to give a junior a start!
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {sponsorships.map(s => {
        const statusCfg = STATUS_CONFIG[s.status];
        const pkgConfig = s.package ? BENEFIT_TYPE_CONFIG[s.package.benefit_type] : null;
        const date = new Date(s.sponsored_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

        return (
          <div
            key={s.id}
            style={{
              background: '#0f0f0f',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {pkgConfig && <span style={{ fontSize: '20px' }} aria-hidden>{pkgConfig.emoji}</span>}
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>
                    {s.package?.title ?? 'Sponsorship'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                    {date}
                    {s.junior_slot && ` · ${s.junior_slot.anonymous_label} (${AGE_GROUP_LABELS[s.junior_slot.age_group]})`}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>
                  {s.scores_paid.toLocaleString()}
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Scores</p>
              </div>
            </div>

            {/* Status badge */}
            <div style={{
              display: 'inline-block',
              padding: '5px 10px',
              borderRadius: '8px',
              background: statusCfg.bg,
              border: `1px solid ${statusCfg.border}`,
              fontSize: '12px',
              color: statusCfg.color,
              alignSelf: 'flex-start',
            }}>
              {statusCfg.label}
            </div>

            {/* Encouragement message */}
            {s.message && (
              <p style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.45)',
                margin: 0,
                fontStyle: 'italic',
                borderLeft: '2px solid rgba(255,255,255,0.1)',
                paddingLeft: '10px',
              }}>
                &ldquo;{s.message}&rdquo;
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
