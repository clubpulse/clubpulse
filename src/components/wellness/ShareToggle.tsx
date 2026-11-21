'use client';

import { useState, useTransition } from 'react';
import { setShareReadiness, type ShareClub } from '@/lib/actions/wellness';

export function ShareToggle({ club }: { club: ShareClub }) {
  const [on, setOn] = useState(club.share);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div style={{ padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', marginBottom: 12 }}>
      <h2 style={{ marginTop: 0 }}>{club.name}</h2>
      {club.canShare ? (
        <label>
          <input type="checkbox" checked={on} disabled={pending} onChange={(e) => {
            const next = e.target.checked; setOn(next);
            start(async () => { const r = await setShareReadiness(club.clubId, next); if (!r.success) { setOn(!next); setMsg(r.error); } else setMsg(next ? 'Your coaches can now see your averages.' : 'Sharing is off.'); });
          }} /> Share my readiness averages with this club’s coaches
        </label>
      ) : <p style={{ margin: 0 }}>Sharing is not available for under-18s.</p>}
      {msg && <p role="status" style={{ marginBottom: 0 }}>{msg}</p>}
    </div>
  );
}
