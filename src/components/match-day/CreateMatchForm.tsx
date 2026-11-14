'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminCreateScorecard } from '@/lib/actions/match-day';

interface Props {
  clubId: string;
}

export function CreateMatchForm({ clubId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [opposition, setOpposition] = useState('');
  const [venue, setVenue] = useState('');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!opposition.trim()) { setError('Opposition name is required'); return; }
    setError('');
    startTransition(async () => {
      const res = await adminCreateScorecard({
        clubId,
        opposition: opposition.trim(),
        venue: venue.trim() || undefined,
        matchDate,
      });
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '14px',
    fontFamily: "'Inter', sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px', display: 'block',
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <label style={labelStyle}>Opposition *</label>
        <input
          style={inputStyle}
          type="text"
          placeholder="e.g. Burnham CC"
          value={opposition}
          onChange={e => setOpposition(e.target.value)}
          required
        />
      </div>
      <div>
        <label style={labelStyle}>Venue</label>
        <input
          style={inputStyle}
          type="text"
          placeholder="e.g. Home — Arbour Park"
          value={venue}
          onChange={e => setVenue(e.target.value)}
        />
      </div>
      <div>
        <label style={labelStyle}>Match date</label>
        <input
          style={inputStyle}
          type="date"
          value={matchDate}
          onChange={e => setMatchDate(e.target.value)}
        />
      </div>

      {error && (
        <p style={{ color: '#fca5a5', fontSize: '13px', margin: 0 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{
          background: isPending ? 'rgba(220,38,38,0.1)' : 'rgba(220,38,38,0.3)',
          border: '1px solid rgba(220,38,38,0.4)', borderRadius: '10px',
          padding: '12px 20px', color: '#fca5a5', fontWeight: 700, fontSize: '14px',
          cursor: isPending ? 'not-allowed' : 'pointer', fontFamily: "'Inter', sans-serif",
          transition: 'all 0.15s',
        }}
      >
        {isPending ? 'Creating…' : '🏏 Start match'}
      </button>
    </form>
  );
}
