'use client';

import { useEffect, useState } from 'react';

interface Pillar {
  name: string;
  score: number;
  label: string;
  detail: string;
}

interface ClubHealth {
  score: number;
  grade: string;
  pillars: Pillar[];
  summary: string;
  generatedAt: string;
}

const GRADE_COLOURS: Record<string, string> = {
  A: '#34d399',
  B: '#c9a54c',
  C: '#f59e0b',
  D: '#f87171',
  F: '#ef4444',
};

export function ClubHealthScore() {
  const [data, setData] = useState<ClubHealth | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/ai/club-health')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const gradeColour = data ? (GRADE_COLOURS[data.grade] ?? '#c9a54c') : '#c9a54c';

  return (
    <div style={{
      background: '#0f0f0f',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '24px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <p style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 700,
            fontSize: '13px', color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0,
          }}>Club health score</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: '3px 0 0' }}>
            AI analysis of the last 30 days
          </p>
        </div>
        <span style={{
          fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.5px', color: '#9b1c1c',
          border: '1px solid rgba(155,28,28,0.4)',
          borderRadius: '6px', padding: '2px 7px',
        }}>AI</span>
      </div>

      {error ? (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Health score unavailable right now.</p>
      ) : !data ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s infinite' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: '16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', width: '60%', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
              <div style={{ height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', width: '40%', animation: 'pulse 1.5s infinite' }} />
            </div>
          </div>
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>
      ) : (
        <>
          {/* Score ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
              <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle
                  cx="40" cy="40" r="34" fill="none"
                  stroke={gradeColour} strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - data.score / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#fff', lineHeight: 1 }}>
                  {data.score}
                </span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1, marginTop: '2px' }}>/ 100</span>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px',
                  color: gradeColour,
                }}>{data.grade}</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>grade</span>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '6px 0 0', lineHeight: 1.4, maxWidth: '220px' }}>
                {data.summary}
              </p>
            </div>
          </div>

          {/* Pillars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.pillars.map((pillar) => (
              <div key={pillar.name}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#fff' }}>{pillar.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{pillar.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: gradeColour }}>{pillar.score}</span>
                  </div>
                </div>
                <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '999px',
                    background: pillar.score >= 70 ? '#34d399' : pillar.score >= 50 ? '#c9a54c' : '#f87171',
                    width: `${pillar.score}%`,
                    transition: 'width 0.8s ease',
                  }} />
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>{pillar.detail}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '16px 0 0' }}>
            Last updated {new Date(data.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </>
      )}
    </div>
  );
}
