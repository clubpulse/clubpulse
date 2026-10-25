'use client';

import { useState, useTransition } from 'react';
import { submitCheckin } from '@/lib/actions/wellbeing';
import { RATING_LABELS } from '@/lib/types/wellbeing';

const RATINGS = [1, 2, 3, 4, 5] as const;

interface Props {
  clubId: string;
}

export function CheckinForm({ clubId }: Props) {
  const [physical, setPhysical] = useState<number | null>(null);
  const [mental, setMental] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!physical || !mental) return;
    startTransition(async () => {
      const result = await submitCheckin(clubId, physical, mental, notes || undefined);
      if (result.success) {
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (done) {
    return (
      <div style={{
        background: 'rgba(16,185,129,0.08)',
        border: '1px solid rgba(16,185,129,0.25)',
        borderRadius: '16px',
        padding: '28px 24px',
        textAlign: 'center',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ fontSize: '36px', marginBottom: '10px' }}>🧡</div>
        <h2 style={{ color: '#10b981', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', margin: '0 0 6px' }}>
          Checked in — thank you
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', margin: 0 }}>
          Your response is private. Only you can see it.
        </p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <RatingRow
        label="Physical wellbeing"
        sublabel="How is your body feeling?"
        value={physical}
        onChange={setPhysical}
      />

      <div style={{ height: '24px' }} />

      <RatingRow
        label="Mental wellbeing"
        sublabel="How are you feeling in yourself?"
        value={mental}
        onChange={setMental}
      />

      <div style={{ height: '20px' }} />

      <div>
        <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>
          Anything on your mind? <span style={{ color: 'rgba(255,255,255,0.25)' }}>(optional, just for you)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything on your mind? Just for you."
          rows={3}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '13px',
            padding: '10px 12px',
            resize: 'vertical',
            boxSizing: 'border-box',
            outline: 'none',
            fontFamily: "'Inter', sans-serif",
          }}
        />
      </div>

      {error && (
        <p style={{ fontSize: '12px', color: '#f87171', margin: '8px 0 0' }}>{error}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!physical || !mental || isPending}
        style={{
          marginTop: '18px',
          width: '100%',
          padding: '12px',
          borderRadius: '10px',
          background: physical && mental ? '#9b1c1c' : 'rgba(255,255,255,0.07)',
          color: physical && mental ? '#fff' : 'rgba(255,255,255,0.3)',
          fontWeight: 600,
          fontSize: '14px',
          border: 'none',
          cursor: physical && mental ? 'pointer' : 'not-allowed',
          transition: 'background 0.2s',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {isPending ? 'Saving…' : 'Submit check-in'}
      </button>

      <p style={{
        fontSize: '11px',
        color: 'rgba(255,255,255,0.25)',
        textAlign: 'center',
        marginTop: '12px',
        lineHeight: 1.5,
      }}>
        🔒 Your responses are completely private. Your coach only sees anonymous group averages — never your individual rating.
      </p>
    </div>
  );
}

function RatingRow({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ marginBottom: '10px' }}>
        <p style={{ color: '#fff', fontWeight: 600, fontSize: '14px', margin: '0 0 2px' }}>{label}</p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>{sublabel}</p>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {RATINGS.map((r) => {
          const info = RATING_LABELS[r];
          const selected = value === r;
          return (
            <button
              key={r}
              onClick={() => onChange(r)}
              title={info.label}
              aria-label={`${r} — ${info.label}`}
              aria-pressed={selected}
              style={{
                flex: 1,
                padding: '10px 4px',
                borderRadius: '10px',
                border: selected ? '2px solid rgba(155,28,28,0.8)' : '1px solid rgba(255,255,255,0.08)',
                background: selected ? 'rgba(155,28,28,0.2)' : 'rgba(255,255,255,0.04)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '22px' }}>{info.emoji}</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.2 }}>
                {info.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
