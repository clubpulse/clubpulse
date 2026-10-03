'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
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

  // Bar: projected total against the next tier (or the top tier once they're past it all)
  const target = data ? data.nextTier ?? Math.max(data.forecast, 1) : 1;
  const width = data ? Math.min(100, Math.round((data.forecast / target) * 100)) : 0;

  return (
    <Card title="Season forecast" description="Where your Scores are heading this season">
      {error ? (
        <p className="text-sm text-neutral-500">Forecast unavailable right now.</p>
      ) : !data ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500"><Spinner /> Working it out…</div>
      ) : (
        <>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold tabular-nums text-white">{formatScores(data.forecast)}</p>
            <p className="text-xs text-neutral-500">{formatScores(data.currentPace)} Scores / week lately</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-800">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-gold" style={{ width: `${width}%` }} />
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            {data.nextTier
              ? `Next tier: ${formatScores(data.nextTier)}${data.sessionsNeeded ? ` · about ${data.sessionsNeeded} sessions away` : ''}`
              : 'Top tier reached'}
          </p>
          <p className="mt-3 text-sm text-neutral-300">{data.message}</p>
        </>
      )}
    </Card>
  );
}
