'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { confirmAdult } from '@/lib/actions/scores-engine';
import { card, cardTitle, muted, pill } from './ui';

// Shown wherever a chance-based feature (raffle, scratch cards, auction, Daily Spin) is locked.
export function AgeConfirm({ isJunior }: { isJunior: boolean }) {
  const router = useRouter();
  const [ticked, setTicked] = useState(false);
  const [error, setError] = useState('');
  const [pending, start] = useTransition();

  if (isJunior) {
    return (
      <div style={card}>
        <p style={cardTitle}>Junior account</p>
        <p style={muted}>
          Your club has you down as a junior, so prize draws, scratch cards, the auction and the Daily Spin are switched off.
          Everything else on this page is yours to earn.
        </p>
      </div>
    );
  }

  return (
    <div style={card}>
      <p style={cardTitle}>Confirm your age</p>
      <p style={{ ...muted, marginBottom: '12px' }}>
        Prize draws, scratch cards, the auction and the Daily Spin are for players aged 18 or over.
      </p>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.8)', cursor: 'pointer' }}>
        <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} style={{ marginTop: '2px' }} />
        I confirm that I am 18 or over.
      </label>
      {error && <p style={{ ...muted, color: '#f87171', marginTop: '8px' }}>{error}</p>}
      <button
        type="button"
        disabled={!ticked || pending}
        onClick={() => start(async () => {
          const res = await confirmAdult();
          if (!res.success) { setError(res.error); return; }
          router.refresh();
        })}
        style={{ ...pill(ticked ? 'gold' : 'grey', !ticked), marginTop: '12px' }}
      >
        {pending ? 'Saving…' : 'Confirm'}
      </button>
    </div>
  );
}
