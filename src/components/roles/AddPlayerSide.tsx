'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** For a club admin who also plays: adds the Player role so the player side appears next to the club side. */
export function AddPlayerSide() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function add() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch('/api/profile/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'player' }) });
      if (!res.ok) throw new Error('failed');
      router.refresh();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <section aria-label="Add the player side" style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>Do you play for the club too?</p>
        <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.55)' }}>Add the player side and it sits next to the club side: Scores, technique, Warm-Up and the rest.</p>
        {failed && <p role="alert" style={{ margin: '6px 0 0', fontSize: '12px', color: '#F87171' }}>That did not work. Try again.</p>}
      </div>
      <button type="button" onClick={add} disabled={busy} style={{ border: 'none', borderRadius: '10px', padding: '10px 16px', fontWeight: 700, fontSize: '14px', color: '#fff', background: '#2563EB', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1, whiteSpace: 'nowrap' }}>
        {busy ? 'Adding…' : 'Add the player side'}
      </button>
    </section>
  );
}
