'use client';
import { useState } from 'react';
import { adminUpdateTransferStatus, requestTransfer } from '@/lib/actions/transfer';
import type { TransferRequestStatus } from '@/lib/types/transfer';

interface TransferReq {
  id: string; from_club_id: string; to_club_id: string; player_user_id: string;
  status: TransferRequestStatus; season: number; notes?: string; created_at: string;
  from_club?: { name: string }; to_club?: { name: string };
}
interface Props { clubId: string; incoming: TransferReq[]; outgoing: TransferReq[]; }

const SC: Record<string, string> = { pending: '#c9a54c', approved: '#4ade80', rejected: '#f87171', withdrawn: 'rgba(255,255,255,0.3)' };

export function AdminTransferClient({ clubId, incoming: iIn, outgoing: iOut }: Props) {
  const [incoming, setIncoming] = useState(iIn);
  const [outgoing, setOutgoing] = useState(iOut);
  const [showNew, setShowNew] = useState(false);
  const [nForm, setNForm] = useState({ to_club_id: '', player_user_id: '', notes: '' });
  const [nLoading, setNLoading] = useState(false);
  const [nError, setNError] = useState<string | null>(null);

  async function updateStatus(id: string, status: TransferRequestStatus, direction: 'in' | 'out') {
    const r = await adminUpdateTransferStatus(id, status);
    if (!r.success) return;
    const upd = (list: TransferReq[]) => list.map(x => x.id === id ? { ...x, status } : x);
    if (direction === 'in') setIncoming(upd);
    else setOutgoing(upd);
  }

  async function handleNewRequest(e: React.FormEvent) {
    e.preventDefault(); setNLoading(true); setNError(null);
    const r = await requestTransfer(clubId, nForm.to_club_id, nForm.notes || undefined);
    setNLoading(false);
    if (!r.success) { setNError(r.error); return; }
    setShowNew(false); setNForm({ to_club_id: '', player_user_id: '', notes: '' });
    window.location.reload();
  }

  const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 12px', color: '#fff', fontSize: '13px', fontFamily: "'Inter', sans-serif", outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, marginBottom: '4px', display: 'block' };

  function RequestRow({ req, direction }: { req: TransferReq; direction: 'in' | 'out' }) {
    return (
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#fff' }}>
            {req.from_club?.name ?? '—'} → {req.to_club?.name ?? '—'}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            {req.notes && ` · "${req.notes}"`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: SC[req.status] ?? '#fff', textTransform: 'capitalize' }}>{req.status}</span>
          {req.status === 'pending' && direction === 'in' && (
            <>
              <button onClick={() => updateStatus(req.id, 'approved', direction)} style={{ padding: '4px 10px', borderRadius: '8px', border: 'none', background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Approve</button>
              <button onClick={() => updateStatus(req.id, 'rejected', direction)} style={{ padding: '4px 10px', borderRadius: '8px', border: 'none', background: 'rgba(248,113,113,0.15)', color: '#f87171', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>Reject</button>
            </>
          )}
          {req.status === 'pending' && direction === 'out' && (
            <button onClick={() => updateStatus(req.id, 'withdrawn', direction)} style={{ padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '11px', cursor: 'pointer' }}>Withdraw</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px' }}>🔄 Transfer Window</h1>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Manage incoming and outgoing player transfer requests</p>
        </div>
        <button onClick={() => setShowNew(true)} style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: '#9b1c1c', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          + New request
        </button>
      </div>

      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px 24px', width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#fff' }}>New Transfer Request</h2>
            <form onSubmit={handleNewRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={lbl}>Destination club ID *</label><input required value={nForm.to_club_id} onChange={e => setNForm(f => ({ ...f, to_club_id: e.target.value }))} placeholder="Club UUID" style={inp} /></div>
              <div><label style={lbl}>Notes</label><textarea value={nForm.notes} onChange={e => setNForm(f => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Reason or context for the request…" style={{ ...inp, resize: 'vertical' }} /></div>
              {nError && <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{nError}</p>}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowNew(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={nLoading} style={{ flex: 2, padding: '10px', borderRadius: '10px', border: 'none', background: '#9b1c1c', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: nLoading ? 'wait' : 'pointer', opacity: nLoading ? 0.7 : 1 }}>{nLoading ? 'Sending…' : 'Send request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff' }}>Incoming Requests</h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{incoming.length === 0 ? 'No incoming requests' : `${incoming.length} request${incoming.length !== 1 ? 's' : ''}`}</p>
        </div>
        {incoming.map(req => <RequestRow key={req.id} req={req} direction="in" />)}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff' }}>Outgoing Requests</h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{outgoing.length === 0 ? 'No outgoing requests' : `${outgoing.length} request${outgoing.length !== 1 ? 's' : ''}`}</p>
        </div>
        {outgoing.map(req => <RequestRow key={req.id} req={req} direction="out" />)}
      </section>
    </div>
  );
}
