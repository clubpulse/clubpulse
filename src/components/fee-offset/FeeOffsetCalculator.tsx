'use client';

import { useState, useTransition } from 'react';
import { applyFeeOffset } from '@/lib/actions/fee-offsets';
import type { FeeOffsetSummary } from '@/lib/types/fee-offsets';

interface Props {
  summary: FeeOffsetSummary;
  clubId: string;
}

export function FeeOffsetCalculator({ summary, clubId }: Props) {
  const { settings, myBalance, maxScoresAllowed } = summary;
  const [scores, setScores] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ scores_applied: number; pounds_offset: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const maxApplicable = Math.min(myBalance, maxScoresAllowed);
  const poundsValue = scores > 0 ? (scores / settings.scores_per_pound).toFixed(2) : '0.00';

  function handleMax() {
    setScores(maxApplicable);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = Math.min(Number(e.target.value), maxApplicable);
    setScores(Math.max(0, val));
  }

  function handleSlider(e: React.ChangeEvent<HTMLInputElement>) {
    setScores(Number(e.target.value));
  }

  function handleSubmit() {
    if (scores <= 0) return;
    setError(null);
    startTransition(async () => {
      const res = await applyFeeOffset(clubId, scores);
      if (res.success) {
        setResult({ scores_applied: res.data.scores_applied, pounds_offset: res.data.pounds_offset });
      } else {
        setError(res.error);
      }
    });
  }

  if (result) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(16,185,129,0.06) 100%)',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: '16px',
        padding: '28px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '20px', color: '#fff', margin: '0 0 6px' }}>
          Offset applied!
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', margin: '0 0 4px' }}>
          You spent <strong style={{ color: '#c9a54c' }}>{result.scores_applied.toLocaleString()} Scores</strong> for a{' '}
          <strong style={{ color: '#4ade80' }}>£{result.pounds_offset.toFixed(2)} discount</strong>.
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Pending admin approval — you&apos;ll be notified when confirmed.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Conversion info */}
      <div style={{
        background: 'rgba(201,165,76,0.08)',
        border: '1px solid rgba(201,165,76,0.2)',
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <span style={{ fontSize: '18px' }}>💡</span>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
          <strong style={{ color: '#c9a54c' }}>{settings.scores_per_pound.toLocaleString()} Scores = £1.00 off</strong>
          {' '}· Up to {settings.max_offset_percent}% of your annual fee
        </p>
      </div>

      {/* Scores input */}
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Scores to apply
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            min={0}
            max={maxApplicable}
            value={scores}
            onChange={handleChange}
            style={{
              flex: 1,
              background: '#0f0f0f',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#fff',
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
            }}
          />
          <button
            onClick={handleMax}
            style={{
              background: 'rgba(201,165,76,0.15)',
              border: '1px solid rgba(201,165,76,0.3)',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#c9a54c',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Max
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={maxApplicable}
          value={scores}
          onChange={handleSlider}
          style={{ width: '100%', marginTop: '10px', accentColor: '#c9a54c' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
          <span>0</span>
          <span>{maxApplicable.toLocaleString()} max</span>
        </div>
      </div>

      {/* Live preview */}
      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
      }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scores to spend</p>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: scores > 0 ? '#c9a54c' : 'rgba(255,255,255,0.2)', fontFamily: "'Syne', sans-serif" }}>
            {scores.toLocaleString()}
          </p>
        </div>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fee discount</p>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: scores > 0 ? '#4ade80' : 'rgba(255,255,255,0.2)', fontFamily: "'Syne', sans-serif" }}>
            £{poundsValue}
          </p>
        </div>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: '13px', color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '8px', padding: '10px 14px' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={scores <= 0 || isPending}
        style={{
          background: scores > 0 ? 'linear-gradient(135deg, #9b1c1c 0%, #c9a54c 100%)' : 'rgba(255,255,255,0.06)',
          border: 'none',
          borderRadius: '12px',
          padding: '14px',
          fontSize: '15px',
          fontWeight: 700,
          color: scores > 0 ? '#fff' : 'rgba(255,255,255,0.2)',
          cursor: scores > 0 ? 'pointer' : 'not-allowed',
          fontFamily: "'Syne', sans-serif",
          letterSpacing: '-0.2px',
          transition: 'opacity 0.15s',
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? 'Applying…' : scores > 0 ? `Apply ${scores.toLocaleString()} Scores → save £${poundsValue}` : 'Enter Scores to apply'}
      </button>
    </div>
  );
}
