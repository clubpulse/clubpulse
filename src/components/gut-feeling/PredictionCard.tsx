'use client';

import { useState, useTransition } from 'react';
import { submitPrediction } from '@/lib/actions/gut-feeling';
import type { PredictionOutcome } from '@/lib/types/gut-feeling';

const OUTCOMES: Array<{ value: PredictionOutcome; label: string; emoji: string; color: string }> = [
  { value: 'win',  label: 'Win',  emoji: '🏆', color: '#22c55e' },
  { value: 'loss', label: 'Loss', emoji: '💀', color: '#ef4444' },
  { value: 'draw', label: 'Draw', emoji: '🤝', color: '#c9a84c' },
  { value: 'rain', label: 'Rain', emoji: '🌧️', color: '#60a5fa' },
];

interface PredictionCardProps {
  fixtureId: string
  opponent: string
  matchDate: string
  venue?: string
  existingPrediction?: PredictionOutcome
  isResolved?: boolean
  isCorrect?: boolean | null
  credsAwarded?: number
  result?: string
}

export function PredictionCard({
  fixtureId,
  opponent,
  matchDate,
  venue,
  existingPrediction,
  isResolved = false,
  isCorrect = null,
  credsAwarded = 0,
  result,
}: PredictionCardProps) {
  const [selected, setSelected] = useState<PredictionOutcome | null>(existingPrediction ?? null);
  const [submitted, setSubmitted] = useState(!!existingPrediction);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const formatted = new Date(matchDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  function handleSelect(outcome: PredictionOutcome) {
    if (submitted || isResolved) return;
    setSelected(outcome);
  }

  function handleSubmit() {
    if (!selected || submitted) return;
    setError(null);
    startTransition(async () => {
      const res = await submitPrediction(fixtureId, selected);
      if (res.success) {
        setSubmitted(true);
      } else {
        setError(res.error ?? 'Something went wrong');
      }
    });
  }

  const isLocked = submitted || isResolved;
  const resultOutcome = OUTCOMES.find((o) => o.value === result);
  const selectedOutcome = OUTCOMES.find((o) => o.value === selected);

  return (
    <div style={{
      background: '#0f0f0f',
      border: `1px solid ${isResolved && isCorrect ? 'rgba(34,197,94,0.3)' : isResolved && isCorrect === false ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Match info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>vs {opponent}</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            {formatted}{venue ? ` · ${venue}` : ''}
          </div>
        </div>

        {/* Resolved badge */}
        {isResolved && isCorrect !== null && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: '4px',
          }}>
            <span style={{ fontSize: '24px', lineHeight: 1 }}>
              {isCorrect ? '✅' : '❌'}
            </span>
            {isCorrect && credsAwarded > 0 && (
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#c9a84c',
                background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: '6px',
                padding: '2px 7px',
              }}>
                +{credsAwarded} Scores
              </span>
            )}
          </div>
        )}

        {/* Awaiting result badge */}
        {submitted && !isResolved && (
          <span style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '3px 8px',
          }}>
            Awaiting result
          </span>
        )}
      </div>

      {/* Outcome buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {OUTCOMES.map((outcome) => {
          const isActive = selected === outcome.value;
          const isResult = result === outcome.value;

          return (
            <button
              key={outcome.value}
              onClick={() => handleSelect(outcome.value)}
              disabled={isLocked || isPending}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 4px',
                borderRadius: '10px',
                border: isActive
                  ? `1.5px solid ${outcome.color}`
                  : isResult
                  ? `1.5px solid ${outcome.color}`
                  : '1.5px solid rgba(255,255,255,0.08)',
                background: isActive
                  ? `${outcome.color}22`
                  : isResult
                  ? `${outcome.color}15`
                  : 'rgba(255,255,255,0.03)',
                cursor: isLocked ? 'default' : 'pointer',
                opacity: isLocked && !isActive ? 0.4 : 1,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{outcome.emoji}</span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: isActive ? outcome.color : 'rgba(255,255,255,0.5)',
              }}>
                {outcome.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Submit / locked state */}
      {!isResolved && (
        submitted ? (
          <div style={{
            textAlign: 'center',
            fontSize: '13px',
            color: 'rgba(255,255,255,0.4)',
          }}>
            You called it: {selectedOutcome?.emoji} <strong style={{ color: '#fff' }}>{selectedOutcome?.label}</strong>. Gut locked in. 🔒
          </div>
        ) : (
          <button
            onClick={handleSubmit}
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
              transition: 'background 0.15s',
            }}
          >
            {isPending ? 'Locking in…' : selected ? `Lock in ${selectedOutcome?.emoji} ${selectedOutcome?.label}` : 'Pick your outcome'}
          </button>
        )
      )}

      {/* Resolved footer */}
      {isResolved && result && (
        <div style={{
          textAlign: 'center',
          fontSize: '13px',
          color: 'rgba(255,255,255,0.4)',
        }}>
          Result: {resultOutcome?.emoji} <strong style={{ color: '#fff' }}>{resultOutcome?.label}</strong>
          {selected && (
            <> · You called: {selectedOutcome?.emoji} <strong style={{ color: '#fff' }}>{selectedOutcome?.label}</strong></>
          )}
        </div>
      )}

      {error && (
        <p style={{ margin: 0, fontSize: '12px', color: '#f87171', textAlign: 'center' }}>{error}</p>
      )}
    </div>
  );
}
