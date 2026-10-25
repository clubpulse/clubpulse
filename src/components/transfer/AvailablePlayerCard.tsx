'use client';
import { useState } from 'react';
import type { TransferAvailable } from '@/lib/types/transfer';
import { expressInterest } from '@/lib/actions/transfer';
interface Props { player: TransferAvailable; viewerClubId?: string; }
export function AvailablePlayerCard({ player, viewerClubId }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function handleInterest() {
    if (!viewerClubId) return;
    setLoading(true); setError(null);
    const result = await expressInterest(player.id, viewerClubId, message);
    setLoading(false);
    if (result.success) { setDone(true); setOpen(false); } else setError(result.error ?? null);
  }
  return (
    <>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Released by {player.club?.name ?? 'Unknown club'}</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: "'Syne', sans-serif" }}>{player.position}</h3>
          </div>
          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(201,165,76,0.15)', color: '#c9a54c', whiteSpace: 'nowrap' }}>{player.level}</span>
        </div>
        {player.description && <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{player.description}</p>}
        {viewerClubId && (
          <button onClick={() => setOpen(true)} disabled={done} style={{ marginTop: '4px', padding: '9px 18px', borderRadius: '10px', border: 'none', cursor: done ? 'default' : 'pointer', background: done ? 'rgba(255,255,255,0.06)' : 'rgba(201,165,76,0.2)', color: done ? 'rgba(255,255,255,0.4)' : '#c9a54c', fontSize: '13px', fontWeight: 600, alignSelf: 'flex-start' }}>
            {done ? 'Interest sent' : 'Express interest'}
          </button>
        )}
      </div>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px 24px', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#fff' }}>Express interest</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{player.position} · {player.level}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Message (optional)</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Introduce your club and what you can offer this player…" rows={4} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '13px', resize: 'vertical', fontFamily: "'Inter', sans-serif", outline: 'none' }} />
            </div>
            {error && <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleInterest} disabled={loading} style={{ flex: 2, padding: '10px', borderRadius: '10px', border: 'none', background: 'rgba(201,165,76,0.3)', color: '#c9a54c', fontSize: '13px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Sending…' : 'Send interest'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
