'use client';

import { useState, useTransition } from 'react';
import { calculatePulseScore } from '@/lib/actions/pulse-score';
import { useRouter } from 'next/navigation';

interface RecalculateButtonProps {
  clubId: string;
  lastCalculatedAt: string;
}

export function RecalculateButton({ clubId, lastCalculatedAt }: RecalculateButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const lastCalc = new Date(lastCalculatedAt);
  const formattedTime = lastCalc.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  function handleRecalculate() {
    setError(null);
    startTransition(async () => {
      const result = await calculatePulseScore(clubId);
      if (!result.success) {
        setError(result.error ?? 'Recalculation failed');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0, fontFamily: "'Inter', sans-serif" }}>
        Last calculated: {formattedTime}
      </p>
      <button
        onClick={handleRecalculate}
        disabled={isPending}
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          border: 'none',
          background: isPending ? 'rgba(155,28,28,0.4)' : 'rgba(155,28,28,0.8)',
          color: '#fff',
          fontSize: '0.875rem',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          cursor: isPending ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {isPending ? (
          <>
            <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
            Recalculating...
          </>
        ) : (
          '💓 Recalculate Now'
        )}
      </button>
      {error && (
        <p style={{ fontSize: '0.75rem', color: '#f87171', margin: 0, fontFamily: "'Inter', sans-serif" }}>
          {error}
        </p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
