'use client';

import { useState } from 'react';
import type { MentorRequest } from '@/lib/types/mentor';
import { logSession } from '@/lib/actions/mentor';

const DURATION_PRESETS = [30, 60, 90, 120] as const;

function credPreview(minutes: number) {
  return {
    mentor: Math.min(minutes * 2, 300),
    mentee: Math.min(minutes, 150),
  };
}

interface Props {
  request: MentorRequest;
  onLogged?: () => void;
}

export function LogSessionForm({ request, onLogged }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ mentor_creds: number; mentee_creds: number } | null>(null);

  const preview = credPreview(duration);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await logSession(request.id, date, duration, notes || undefined);
    setLoading(false);

    if (res.success) {
      setResult({ mentor_creds: res.data.mentor_creds, mentee_creds: res.data.mentee_creds });
      onLogged?.();
    } else {
      setError(res.error);
    }
  }

  if (result) {
    return (
      <div style={{
        background: 'rgba(74,222,128,0.08)',
        border: '1px solid rgba(74,222,128,0.2)',
        borderRadius: '16px', padding: '24px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        alignItems: 'center', textAlign: 'center',
      }}>
        <span style={{ fontSize: '32px' }}>🎉</span>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '16px', color: '#4ade80' }}>
          Session logged!
        </p>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>+{result.mentor_creds}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Your Scores</div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>+{result.mentee_creds}</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Mentee Scores</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <label style={{
          fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block',
        }}>
          Session date
        </label>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          required
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px', padding: '10px 12px',
            fontSize: '14px', color: '#fff', outline: 'none',
          }}
        />
      </div>

      <div>
        <label style={{
          fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'block',
        }}>
          Duration
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {DURATION_PRESETS.map((min) => (
            <button
              key={min}
              type="button"
              onClick={() => setDuration(min)}
              style={{
                flex: 1,
                background: duration === min ? 'rgba(155,28,28,0.35)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${duration === min ? 'rgba(155,28,28,0.6)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '10px', padding: '10px 0',
                fontSize: '14px', fontWeight: 600,
                color: duration === min ? '#f87171' : 'rgba(255,255,255,0.55)',
                cursor: 'pointer',
              }}
            >
              {min}m
            </button>
          ))}
        </div>
      </div>

      {/* Creds preview */}
      <div style={{
        background: 'rgba(155,28,28,0.1)',
        border: '1px solid rgba(155,28,28,0.2)',
        borderRadius: '12px', padding: '14px',
        display: 'flex', justifyContent: 'space-around',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f87171' }}>+{preview.mentor}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Your Scores</div>
        </div>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#f87171' }}>+{preview.mentee}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Mentee Scores</div>
        </div>
      </div>

      <div>
        <label style={{
          fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.5)',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'block',
        }}>
          Session notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you work on? Any key takeaways?"
          rows={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px', padding: '10px 12px',
            fontSize: '14px', color: '#fff',
            resize: 'vertical', fontFamily: 'inherit', outline: 'none',
          }}
        />
      </div>

      {error && <p style={{ margin: 0, color: '#f87171', fontSize: '13px' }}>{error}</p>}

      <button
        type="submit"
        disabled={loading}
        style={{
          background: 'linear-gradient(135deg,#9b1c1c,#c0392b)',
          border: 'none', borderRadius: '12px',
          padding: '12px', fontSize: '15px',
          fontWeight: 700, color: '#fff',
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Logging…' : 'Log session & claim Scores'}
      </button>
    </form>
  );
}
