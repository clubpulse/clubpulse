'use client';

import { useState, useTransition } from 'react';
import { adminResolvePitchVotes } from '@/lib/actions/pitch';
import { PITCH_CONFIG, type PitchCondition } from '@/lib/types/pitch';

interface AdminResolvePanelProps {
  fixtureId: string;
}

export function AdminResolvePanel({ fixtureId }: AdminResolvePanelProps) {
  const [selected, setSelected] = useState<PitchCondition | null>(null);
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState<{ correctCount: number; creds: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conditions = Object.keys(PITCH_CONFIG) as PitchCondition[];

  function handleResolve() {
    if (!selected || isPending) return;
    startTransition(async () => {
      setError(null);
      const result = await adminResolvePitchVotes(fixtureId, selected, notes || undefined);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setResolved({ correctCount: result.data.correct_count, creds: result.data.creds_per_winner });
    });
  }

  if (resolved) {
    return (
      <div style={{
        background: 'rgba(34,197,94,0.12)',
        border: '1px solid rgba(34,197,94,0.3)',
        borderRadius: '10px',
        padding: '12px 16px',
        fontSize: '13px',
        color: '#4ade80',
        fontWeight: 600,
      }}>
        ✅ Resolved — {resolved.correctCount} player{resolved.correctCount !== 1 ? 's' : ''} earned {resolved.creds} Scores each
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
        Actual pitch condition
      </p>

      {/* Condition selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {conditions.map((condition) => {
          const cfg = PITCH_CONFIG[condition];
          const isChosen = selected === condition;
          return (
            <button
              key={condition}
              onClick={() => setSelected(condition)}
              style={{
                background: isChosen ? 'rgba(155,28,28,0.35)' : 'rgba(255,255,255,0.05)',
                border: isChosen ? '1px solid rgba(220,38,38,0.6)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '6px 12px',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '12px',
                fontWeight: isChosen ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'background 0.15s, border 0.15s',
              }}
            >
              <span>{cfg.emoji}</span>
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder='Optional notes — e.g. "Good length area had grass, played seam early"'
        rows={2}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '8px 10px',
          color: '#fff',
          fontSize: '12px',
          resize: 'vertical',
          fontFamily: "'Inter', sans-serif",
          outline: 'none',
        }}
      />

      {error && <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{error}</p>}

      <button
        onClick={handleResolve}
        disabled={!selected || isPending}
        style={{
          background: selected ? 'rgba(155,28,28,0.8)' : 'rgba(255,255,255,0.06)',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          color: selected ? '#fff' : 'rgba(255,255,255,0.3)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: selected ? 'pointer' : 'default',
          alignSelf: 'flex-start',
          transition: 'background 0.15s',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {isPending ? 'Resolving…' : 'Resolve & award Scores'}
      </button>
    </div>
  );
}
