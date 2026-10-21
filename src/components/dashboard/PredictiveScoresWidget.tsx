'use client';

import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';
import { formatScores } from '@/lib/utils/format';
import type { PredictiveScores } from '@/lib/ai/predictive-scores';

export function PredictiveScoresWidget() {
  const [data, setData] = useState<PredictiveScores | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/ai/predictive-scores', { method: 'POST', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('failed'))))
      .then(setData)
      .catch((err) => {
        if (err?.name !== 'AbortError') setError(true);
      });
    return () => controller.abort();
  }, []);

  const target = data ? data.nextTier ?? Math.max(data.forecast, 1) : 1;
  const width = data ? Math.min(100, Math.round((data.forecast / target) * 100)) : 0;

  return (
    <div style={{
      background: '#0f0f0f',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '20px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <p style={{
        fontFamily: "'Syne', sans-serif", fontWeight: 700,
        fontSize: '13px', color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', letterSpacing: '0.8px',
        margin: '0 0 4px',
      }}>Season forecast</p>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', margin: '0 0 14px' }}>
        Where your Scores are heading this season
      </p>

      {error ? (
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Forecast unavailable right now.</p>
      ) : !data ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
          <Spinner /> Working it out…
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: '32px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
              {formatScores(data.forecast)}
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
              {formatScores(data.currentPace)} / week lately
            </p>
          </div>

          <div style={{ marginTop: '12px', height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '999px',
              background: 'linear-gradient(90deg, #9b1c1c, #c9a54c)',
              width: `${width}%`, transition: 'width 0.8s ease',
            }} />
          </div>

          <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {data.nextTier
              ? `Next tier: ${formatScores(data.nextTier)}${data.sessionsNeeded ? ` · ~${data.sessionsNeeded} sessions away` : ''}`
              : 'Top tier reached 🏆'}
          </p>

          <p style={{ margin: '12px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
            {data.message}
          </p>
        </>
      )}
    </div>
  );
}
