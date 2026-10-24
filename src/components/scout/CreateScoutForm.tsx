'use client';

import { useState, useTransition } from 'react';
import { createScoutSession } from '@/lib/actions/scout';

interface Props {
  clubId: string;
}

export function CreateScoutForm({ clubId }: Props) {
  const [sessionName, setSessionName] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createScoutSession({ clubId, sessionName, dateFrom, dateTo });
      if (!result.success) {
        setError(result.error ?? 'Something went wrong');
      } else {
        setSessionName('');
        setDateFrom('');
        setDateTo('');
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '13px',
    color: '#fff',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: '6px',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={labelStyle} htmlFor="session-name">Session name</label>
        <input
          id="session-name"
          style={inputStyle}
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          placeholder="e.g. Pre-season scouting – Oct 2026"
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={labelStyle} htmlFor="date-from">From</label>
          <input
            id="date-from"
            type="date"
            style={inputStyle}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={labelStyle} htmlFor="date-to">To</label>
          <input
            id="date-to"
            type="date"
            style={inputStyle}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            required
          />
        </div>
      </div>

      {error && (
        <p style={{ fontSize: '12px', color: '#f87171', margin: 0 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          background: isPending ? 'rgba(155,28,28,0.4)' : '#9b1c1c',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          padding: '10px 18px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: isPending ? 'not-allowed' : 'pointer',
          fontFamily: "'Inter', sans-serif",
          transition: 'background 0.15s',
        }}
      >
        {isPending ? 'Creating…' : '🔍 Create Scout Session'}
      </button>
    </form>
  );
}
