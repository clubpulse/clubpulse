'use client';

import { useState, useTransition } from 'react';
import { MOOD_CONFIG, type MoodType } from '@/lib/types/match-mood';
import { setMyMood } from '@/lib/actions/match-mood';

interface MoodPickerProps {
  fixtureId: string;
  initialMood?: MoodType | null;
  opponent: string;
  matchDate: string;
}

export function MoodPicker({ fixtureId, initialMood, opponent, matchDate }: MoodPickerProps) {
  const [selected, setSelected] = useState<MoodType | null>(initialMood ?? null);
  const [saved, setSaved] = useState(!!initialMood);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const moods = Object.entries(MOOD_CONFIG) as Array<[MoodType, { emoji: string; label: string; color: string }]>;

  function handleSelect(mood: MoodType) {
    if (saved) return; // locked after saving
    setSelected(prev => (prev === mood ? null : mood));
  }

  function handleConfirm() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await setMyMood(fixtureId, selected);
      if (result.success) {
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  }

  const date = new Date(matchDate).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '16px',
      padding: '24px',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ marginBottom: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Next Match — {date}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '20px' }}>
        vs {opponent}
      </div>

      {saved ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          padding: '24px',
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '12px',
        }}>
          <span style={{ fontSize: '48px' }}>{selected ? MOOD_CONFIG[selected].emoji : '🔒'}</span>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
            Mood locked in 🔒
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            You&apos;re feeling {selected ? MOOD_CONFIG[selected].label : ''} for this one
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
            How are you feeling heading into this match?
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px',
            marginBottom: '20px',
          }}>
            {moods.map(([mood, config]) => {
              const isSelected = selected === mood;
              return (
                <button
                  key={mood}
                  onClick={() => handleSelect(mood)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '14px 8px',
                    borderRadius: '12px',
                    border: isSelected
                      ? '2px solid rgba(201,165,76,0.8)'
                      : '2px solid rgba(255,255,255,0.06)',
                    background: isSelected
                      ? 'rgba(201,165,76,0.12)'
                      : 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    transform: isSelected ? 'scale(1.06)' : 'scale(1)',
                    outline: 'none',
                  }}
                  aria-pressed={isSelected}
                  aria-label={config.label}
                >
                  <span style={{ fontSize: '32px', lineHeight: 1 }}>{config.emoji}</span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isSelected ? '#c9a54c' : 'rgba(255,255,255,0.5)',
                  }}>
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <div style={{ fontSize: '13px', color: '#f87171', marginBottom: '12px' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!selected || isPending}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: selected && !isPending
                ? 'linear-gradient(135deg, #c9a54c, #a0783a)'
                : 'rgba(255,255,255,0.08)',
              color: selected && !isPending ? '#fff' : 'rgba(255,255,255,0.3)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: selected && !isPending ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {isPending ? 'Saving…' : 'Lock in my mood'}
          </button>
        </>
      )}
    </div>
  );
}
