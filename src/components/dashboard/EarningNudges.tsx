'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Nudge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  scoresPotential: number;
  href?: string;
  cta?: string;
}

export function EarningNudges() {
  const [nudges, setNudges] = useState<Nudge[] | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/ai/earning-nudges', { method: 'POST', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setNudges(data.nudges))
      .catch((err) => { if (err?.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, []);

  const visible = nudges?.filter((n) => !dismissed.has(n.id)) ?? [];

  if (error || (nudges && visible.length === 0)) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(201,165,76,0.08) 0%, #0f0f0f 70%)',
      border: '1px solid rgba(201,165,76,0.18)',
      borderRadius: '16px',
      padding: '20px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <p style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 700,
            fontSize: '13px', color: '#c9a54c',
            textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0,
          }}>Earn more Scores</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: '3px 0 0' }}>
            Personalised opportunities for you right now
          </p>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.5px', color: '#9b1c1c',
          border: '1px solid rgba(155,28,28,0.4)',
          borderRadius: '6px', padding: '2px 7px',
        }}>AI</span>
      </div>

      {!nudges ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2].map((i) => (
            <div key={i} style={{
              height: '60px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.03)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {visible.map((nudge) => (
            <div key={nudge.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px', padding: '12px',
            }}>
              <span style={{ fontSize: '22px', flexShrink: 0, lineHeight: 1 }}>{nudge.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>{nudge.title}</p>
                  <span style={{ flexShrink: 0, fontSize: '12px', fontWeight: 700, color: '#c9a54c' }}>
                    +{nudge.scoresPotential} Scores
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', lineHeight: 1.4 }}>
                  {nudge.description}
                </p>
                {nudge.href && (
                  <Link href={nudge.href} style={{
                    display: 'inline-block', marginTop: '8px',
                    fontSize: '12px', fontWeight: 600, color: '#c9a54c',
                    textDecoration: 'none',
                  }}>
                    {nudge.cta ?? 'Get started'} →
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDismissed((s) => new Set([...s, nudge.id]))}
                aria-label="Dismiss"
                style={{
                  flexShrink: 0, background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.2)', cursor: 'pointer',
                  fontSize: '16px', padding: '0', lineHeight: 1,
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
