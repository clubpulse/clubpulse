'use client';

import { useState, useTransition } from 'react';
import { adminResolvePredictions } from '@/lib/actions/gut-feeling';
import type { PredictionOutcome } from '@/lib/types/gut-feeling';

const OUTCOMES: Array<{ value: PredictionOutcome; emoji: string; label: string }> = [
  { value: 'win',  emoji: '🏆', label: 'Win' },
  { value: 'loss', emoji: '💀', label: 'Loss' },
  { value: 'draw', emoji: '🤝', label: 'Draw' },
  { value: 'rain', emoji: '🌧️', label: 'Rain' },
];

interface PendingFixture {
  fixture_id: string
  opponent: string
  match_date: string
  total_predictions: number
  distribution: Record<PredictionOutcome, number>
}

export function AdminResolveList({ fixtures }: { fixtures: PendingFixture[] }) {
  if (fixtures.length === 0) {
    return (
      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.3)',
        fontSize: '14px',
      }}>
        No fixtures with pending predictions right now.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {fixtures.map((fixture) => (
        <FixtureResolveCard key={fixture.fixture_id} fixture={fixture} />
      ))}
    </div>
  );
}

function FixtureResolveCard({ fixture }: { fixture: PendingFixture }) {
  const [selected, setSelected] = useState<PredictionOutcome | null>(null);
  const [resolved, setResolved] = useState(false);
  const [correctCount, setCorrectCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const formatted = new Date(fixture.match_date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  function handleResolve() {
    if (!selected || resolved) return;
    setError(null);
    startTransition(async () => {
      const res = await adminResolvePredictions(fixture.fixture_id, selected);
      if (res.success) {
        setResolved(true);
        setCorrectCount(res.data.correct_count);
      } else {
        setError(res.error ?? 'Failed to resolve');
      }
    });
  }

  return (
    <div style={{
      background: '#0f0f0f',
      border: resolved ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(255,255,255,0.07)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Match header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>vs {fixture.opponent}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{formatted}</div>
        </div>
        <div style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.35)',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          padding: '4px 10px',
        }}>
          {fixture.total_predictions} {fixture.total_predictions === 1 ? 'prediction' : 'predictions'}
        </div>
      </div>

      {/* Prediction distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {OUTCOMES.map((o) => {
          const count = fixture.distribution[o.value] ?? 0;
          const pct = fixture.total_predictions > 0
            ? Math.round((count / fixture.total_predictions) * 100)
            : 0;
          return (
            <div key={o.value} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px',
              padding: '10px 8px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '18px', lineHeight: 1 }}>{o.emoji}</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif", marginTop: '4px' }}>
                {count}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {pct}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Resolve section */}
      {!resolved ? (
        <>
          <div>
            <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Actual result
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setSelected(o.value)}
                  disabled={isPending}
                  style={{
                    padding: '10px 4px',
                    borderRadius: '10px',
                    border: selected === o.value ? '1.5px solid #9b1c1c' : '1.5px solid rgba(255,255,255,0.08)',
                    background: selected === o.value ? 'rgba(155,28,28,0.2)' : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{o.emoji}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: selected === o.value ? '#fff' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {o.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleResolve}
            disabled={!selected || isPending}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              border: 'none',
              background: selected ? '#9b1c1c' : 'rgba(255,255,255,0.07)',
              color: selected ? '#fff' : 'rgba(255,255,255,0.3)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: selected ? 'pointer' : 'not-allowed',
            }}
          >
            {isPending ? 'Resolving…' : 'Resolve & award Scores'}
          </button>

          {error && (
            <p style={{ margin: 0, fontSize: '12px', color: '#f87171', textAlign: 'center' }}>{error}</p>
          )}
        </>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '12px',
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '10px',
          fontSize: '14px',
          color: '#22c55e',
          fontWeight: 600,
        }}>
          ✅ Resolved — {correctCount} {correctCount === 1 ? 'player' : 'players'} earned 100 Scores
        </div>
      )}
    </div>
  );
}
