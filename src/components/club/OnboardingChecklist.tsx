'use client';

import Link from 'next/link';
import type { OnboardingStep } from '@/lib/admin/club-service';
import { card, cardTitle } from '@/components/play/ui';

type Props = {
  steps: OnboardingStep[];
};

export function OnboardingChecklist({ steps }: Props) {
  const done = steps.filter((s) => s.complete).length;
  const total = steps.length;
  const pct = Math.round((done / total) * 100);

  if (done === total) return null; // Hide when complete

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <p style={cardTitle}>Getting started</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>
            {done}/{total} complete
          </span>
          <div
            style={{
              flex: 1,
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: '3px',
                background: '#00C853',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {steps.map((step) => (
          <Link key={step.key} href={step.href} style={{ textDecoration: 'none' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 8px',
                borderRadius: '8px',
                transition: 'background 0.15s',
              }}
            >
              <span
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: step.complete
                    ? 'rgba(34,197,94,0.2)'
                    : 'rgba(255,255,255,0.06)',
                  color: step.complete ? '#22C55E' : 'rgba(255,255,255,0.3)',
                  border: step.complete
                    ? '1px solid rgba(34,197,94,0.3)'
                    : '1px solid rgba(255,255,255,0.1)',
                  flexShrink: 0,
                }}
              >
                {step.complete ? '✓' : ''}
              </span>
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: step.complete
                      ? 'rgba(255,255,255,0.45)'
                      : '#fff',
                    textDecoration: step.complete ? 'line-through' : 'none',
                  }}
                >
                  {step.label}
                </p>
                <p
                  style={{
                    margin: '1px 0 0',
                    fontSize: '11.5px',
                    color: 'rgba(255,255,255,0.35)',
                  }}
                >
                  {step.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
