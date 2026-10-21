'use client';

import { useEffect, useState } from 'react';

interface Insight {
  title: string;
  body: string;
  type: 'tip' | 'warning' | 'milestone';
}

interface InsightsData {
  insights: Insight[];
  generatedAt: string;
}

const TYPE_STYLES: Record<Insight['type'], { dot: string; label: string }> = {
  tip:       { dot: '#c9a54c', label: '💡 Tip' },
  warning:   { dot: '#ef4444', label: '⚠️ Watch out' },
  milestone: { dot: '#34d399', label: '🏆 Milestone' },
};

export function PerformanceInsights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<number | null>(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/ai/performance-insights', { method: 'POST', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setData)
      .catch((err) => { if (err?.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, []);

  return (
    <div style={{
      background: '#0f0f0f',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '20px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <p style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 700,
            fontSize: '13px', color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0,
          }}>Performance insights</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: '3px 0 0' }}>
            AI analysis of your recent activity
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
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Insights unavailable right now.</p>
      ) : !data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              height: '56px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.03)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.insights.map((insight, i) => {
            const style = TYPE_STYLES[insight.type];
            const isOpen = open === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: isOpen ? 'rgba(255,255,255,0.04)' : 'transparent',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px', padding: '12px',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: style.dot, flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{style.label}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#fff', flex: 1 }}>{insight.title}</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
                  </div>
                  {isOpen && (
                    <p style={{ margin: '10px 0 0 15px', fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                      {insight.body}
                    </p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
