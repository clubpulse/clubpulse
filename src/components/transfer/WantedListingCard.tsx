'use client';
import { useState } from 'react';
import type { TransferWanted } from '@/lib/types/transfer';
import { applyToListing } from '@/lib/actions/transfer';
interface Props { listing: TransferWanted; alreadyApplied?: boolean; }
export function WantedListingCard({ listing, alreadyApplied = false }: Props) {
  const [open, setOpen] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(alreadyApplied);
  const [error, setError] = useState<string | null>(null);
  async function handleApply() {
    setLoading(true); setError(null);
    const result = await applyToListing(listing.id, coverNote);
    setLoading(false);
    if (result.success) { setApplied(true); setOpen(false); setCoverNote(''); }
    else setError(result.error);
  }
  return (
    <>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{listing.club?.name ?? 'Unknown club'}</p>
            <h3 style={{ margin: '2px 0 0', fontSize: '15px', fontWeight: 700, color: '#fff', fontFamily: "'Syne', sans-serif" }}>{listing.position}</h3>
          </div>
          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(155,28,28,0.25)', color: '#f87171', whiteSpace: 'nowrap' }}>{listing.level_required}</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {listing.age_range && <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Age: {listing.age_range}</span>}
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{listing.applications_count} applicant{listing.applications_count !== 1 ? 's' : ''}</span>
        </div>
        {listing.description && <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{listing.description}</p>}
        <button onClick={() => setOpen(true)} disabled={applied} style={{ marginTop: '4px', padding: '9px 18px', borderRadius: '10px', border: 'none', cursor: applied ? 'default' : 'pointer', background: applied ? 'rgba(255,255,255,0.06)' : '#9b1c1c', color: applied ? 'rgba(255,255,255,0.4)' : '#fff', fontSize: '13px', fontWeight: 600, alignSelf: 'flex-start' }}>
          {applied ? 'Applied' : 'Apply'}
        </button>
      </div>
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '28px 24px', width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '18px', color: '#fff' }}>Apply — {listing.position}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{listing.club?.name}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Cover note (optional)</label>
              <textarea value={coverNote} onChange={(e) => setCoverNote(e.target.value)} placeholder="Tell the club about yourself and why you'd be a great fit…" rows={5} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', color: '#fff', fontSize: '13px', resize: 'vertical', fontFamily: "'Inter', sans-serif", outline: 'none' }} />
            </div>
            {error && <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setOpen(false)} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleApply} disabled={loading} style={{ flex: 2, padding: '10px', borderRadius: '10px', border: 'none', background: '#9b1c1c', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'Submitting…' : 'Submit application'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
