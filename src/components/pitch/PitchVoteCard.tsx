'use client';

import { useState, useTransition } from 'react';
import { submitPitchVote } from '@/lib/actions/pitch';
import { PITCH_CONFIG, type PitchCondition, type PitchVoteAggregate } from '@/lib/types/pitch';

interface PitchVoteCardProps {
  fixtureId: string;
  clubId: string;
  fixtureLabel: string;
  initialVote?: PitchCondition | null;
  initialAggregates?: PitchVoteAggregate[];
  resolvedCondition?: PitchCondition | null;
}

export function PitchVoteCard({
  fixtureId,
  clubId,
  fixtureLabel,
  initialVote = null,
  initialAggregates = [],
  resolvedCondition = null,
}: PitchVoteCardProps) {
  const [selected, setSelected] = useState<PitchCondition | null>(initialVote);
  const [aggregates, setAggregates] = useState<PitchVoteAggregate[]>(initialAggregates);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isLocked = selected !== null || resolvedCondition !== null;
  const conditions = Object.keys(PITCH_CONFIG) as PitchCondition[];

  function handleVote(condition: PitchCondition) {
    if (isLocked || isPending) return;
    startTransition(async () => {
      setError(null);
      const result = await submitPitchVote(fixtureId, clubId, condition);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSelected(condition);
      // Optimistically update aggregates
      setAggregates((prev) => {
        const existing = prev.find((a) => a.condition === condition);
        const others = prev.filter((a) => a.condition !== condition);
        const newCount = (existing?.count ?? 0) + 1;
        const total = prev.reduce((s, a) => s + a.count, 0) + 1;
        const updated = [...others, { condition, count: newCount, percent: Math.round((newCount / total) * 100) }];
        return updated.map((a) => ({
          ...a,
          percent: a.condition === condition ? Math.round((a.count / total) * 100) : Math.round((a.count / total) * 100),
        }));
      });
    });
  }

  const totalVotes = aggregates.reduce((s, a) => s + a.count, 0);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div>
        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Upcoming fixture
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 600, color: '#fff' }}>{fixtureLabel}</p>
      </div>

      {/* Condition buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {conditions.map((condition) => {
          const cfg = PITCH_CONFIG[condition];
          const isChosen = selected === condition;
          const isResolved = resolvedCondition !== null;
          const isCorrect = isResolved && isChosen && resolvedCondition === condition;
          const isWrong = isResolved && isChosen && resolvedCondition !== condition;

          let bg = 'rgba(255,255,255,0.05)';
          let border = '1px solid rgba(255,255,255,0.1)';
          if (isChosen && !isResolved) { bg = 'rgba(155,28,28,0.25)'; border = '1px solid rgba(220,38,38,0.5)'; }
          if (isCorrect) { bg = 'rgba(34,197,94,0.2)'; border = '1px solid rgba(34,197,94,0.5)'; }
          if (isWrong) { bg = 'rgba(239,68,68,0.15)'; border = '1px solid rgba(239,68,68,0.35)'; }

          return (
            <button
              key={condition}
              onClick={() => handleVote(condition)}
              disabled={isLocked || isPending}
              style={{
                background: bg,
                border,
                borderRadius: '12px',
                padding: '12px',
                cursor: isLocked ? 'default' : 'pointer',
                textAlign: 'left',
                opacity: isLocked && !isChosen ? 0.5 : 1,
                transition: 'background 0.15s, border 0.15s',
              }}
            >
              <div style={{ fontSize: '22px', marginBottom: '4px' }}>{cfg.emoji}</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{cfg.label}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px', lineHeight: 1.4 }}>
                {cfg.description}
              </div>
              {isCorrect && <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '4px', fontWeight: 600 }}>✅ Correct! +75 Scores</div>}
              {isWrong && <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px', fontWeight: 600 }}>❌ Wrong call</div>}
            </button>
          );
        })}
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{error}</p>
      )}

      {/* Vote distribution */}
      {aggregates.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Club predictions · {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          </p>
          {aggregates
            .sort((a, b) => b.count - a.count)
            .map((agg) => {
              const cfg = PITCH_CONFIG[agg.condition];
              return (
                <div key={agg.condition} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '14px', width: '18px' }}>{cfg.emoji}</span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', width: '44px' }}>{cfg.label}</span>
                  <div style={{
                    flex: 1,
                    height: '6px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${agg.percent}%`,
                      height: '100%',
                      background: agg.condition === selected ? 'rgba(220,38,38,0.8)' : 'rgba(255,255,255,0.25)',
                      borderRadius: '3px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', width: '32px', textAlign: 'right' }}>
                    {agg.percent}%
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {selected && !resolvedCondition && (
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          Vote locked in — result revealed after the match 🔒
        </p>
      )}
    </div>
  );
}
