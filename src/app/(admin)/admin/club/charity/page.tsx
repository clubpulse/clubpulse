'use client';

import { useState, useTransition, useEffect } from 'react';
import type { ClubCharity, CharitySettings, CharityDonationBatch } from '@/lib/types/charity';
import type { PendingDonationGroup } from '@/lib/actions/charity';
import {
  getAllClubCharities, adminAddCharity, adminToggleCharity,
  adminUpdateCharitySettings, adminGetPendingDonations,
  adminProcessDonationBatch, adminGetDonationBatches,
} from '@/lib/actions/charity';
import { getAdminCharityPageData } from './actions';

export default function AdminCharityPage() {
  const [clubId, setClubId] = useState<string | null>(null);
  const [charities, setCharities] = useState<ClubCharity[]>([]);
  const [pending, setPending] = useState<PendingDonationGroup[]>([]);
  const [batches, setBatches] = useState<CharityDonationBatch[]>([]);
  const [settings, setSettings] = useState<CharitySettings>({ scores_per_pound: 1000, is_enabled: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [isPendingAdd, startAdd] = useTransition();

  const [scoresPerPound, setScoresPerPound] = useState('1000');
  const [donationsEnabled, setDonationsEnabled] = useState(true);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [isPendingSettings, startSettings] = useTransition();

  const [batchRef, setBatchRef] = useState<Record<string, string>>({});
  const [batchMsg, setBatchMsg] = useState<Record<string, string>>({});
  const [isPendingBatch, startBatch] = useTransition();

  useEffect(() => {
    getAdminCharityPageData().then(res => {
      if (!res.success) { setError(res.error); setLoading(false); return; }
      const { clubId: cid, charities: ch, pending: p, batches: b, settings: s } = res.data;
      setClubId(cid); setCharities(ch); setPending(p); setBatches(b); setSettings(s);
      setScoresPerPound(String(s.scores_per_pound)); setDonationsEnabled(s.is_enabled);
      setLoading(false);
    });
  }, []);

  async function refresh() {
    if (!clubId) return;
    const [ch, p, b] = await Promise.all([getAllClubCharities(clubId), adminGetPendingDonations(clubId), adminGetDonationBatches(clubId)]);
    if (ch.success) setCharities(ch.data);
    if (p.success) setPending(p.data);
    if (b.success) setBatches(b.data);
  }

  function handleAddCharity() {
    if (!clubId || !newName.trim()) return;
    setAddError(null);
    startAdd(async () => {
      const res = await adminAddCharity(clubId, { name: newName.trim(), description: newDesc.trim() || undefined, charity_number: newNumber.trim() || undefined, website_url: newWebsite.trim() || undefined });
      if (res.success) { setShowAdd(false); setNewName(''); setNewDesc(''); setNewNumber(''); setNewWebsite(''); await refresh(); }
      else setAddError(res.error);
    });
  }

  function handleToggle(id: string, cur: boolean) { startAdd(async () => { await adminToggleCharity(id, !cur); await refresh(); }); }

  function handleSaveSettings() {
    if (!clubId) return;
    const spp = parseInt(scoresPerPound, 10);
    if (!spp || spp < 1) return;
    startSettings(async () => {
      const res = await adminUpdateCharitySettings(clubId, { scores_per_pound: spp, is_enabled: donationsEnabled });
      if (res.success) { setSettings({ scores_per_pound: spp, is_enabled: donationsEnabled }); setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 2500); }
    });
  }

  function handleProcessBatch(charityId: string) {
    if (!clubId) return;
    const ref = batchRef[charityId]?.trim();
    if (!ref) { setBatchMsg({ ...batchMsg, [charityId]: 'Enter a transaction reference first.' }); return; }
    startBatch(async () => {
      const res = await adminProcessDonationBatch(clubId, charityId, ref);
      if (res.success) { setBatchMsg({ ...batchMsg, [charityId]: 'Batch processed successfully.' }); setBatchRef({ ...batchRef, [charityId]: '' }); await refresh(); }
      else setBatchMsg({ ...batchMsg, [charityId]: res.error });
    });
  }

  const iStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', color: '#fff', outline: 'none', boxSizing: 'border-box' as const };
  const btnPrimary = { background: '#9b1c1c', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' as const };

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>Loading…</p>;
  if (error) return <p style={{ color: '#f87171', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>{error}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#fff', margin: '0 0 4px' }}>❤️ Charity Management</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Configure charities, conversion rate, and process donation batches.</p>
      </div>

      {/* Settings */}
      <section>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 14px', fontFamily: "'Syne', sans-serif" }}>Donation Settings</h2>
        <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 200px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Scores per £1 donated</label>
              <input type="number" value={scoresPerPound} onChange={e => setScoresPerPound(e.target.value)} style={iStyle} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
              <input type="checkbox" checked={donationsEnabled} onChange={e => setDonationsEnabled(e.target.checked)} />
              Donations enabled
            </label>
            <button onClick={handleSaveSettings} disabled={isPendingSettings} style={btnPrimary}>{isPendingSettings ? 'Saving…' : 'Save settings'}</button>
          </div>
          {settingsSaved && <p style={{ margin: 0, fontSize: '12px', color: '#4ade80' }}>Settings saved.</p>}
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Current: {settings.scores_per_pound.toLocaleString()} Scores = £1 · Donations {settings.is_enabled ? 'enabled' : 'disabled'}</p>
        </div>
      </section>

      {/* Charities */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0, fontFamily: "'Syne', sans-serif" }}>Charities</h2>
          <button onClick={() => setShowAdd(v => !v)} style={{ ...btnPrimary, background: showAdd ? 'rgba(255,255,255,0.06)' : '#9b1c1c', fontSize: '12px', padding: '7px 14px' }}>{showAdd ? 'Cancel' : '+ Add charity'}</button>
        </div>
        {showAdd && (
          <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: 600 }}>Add new charity</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Charity name *" style={iStyle} />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)" style={iStyle} />
            <input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="UK charity number (optional)" style={iStyle} />
            <input value={newWebsite} onChange={e => setNewWebsite(e.target.value)} placeholder="Website URL (optional)" style={iStyle} />
            {addError && <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{addError}</p>}
            <button onClick={handleAddCharity} disabled={isPendingAdd || !newName.trim()} style={{ ...btnPrimary, alignSelf: 'flex-start' }}>{isPendingAdd ? 'Adding…' : 'Add charity'}</button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {charities.length === 0 && <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>No charities configured yet.</p>}
          {charities.map(ch => (
            <div key={ch.id} style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: ch.is_active ? '#fff' : 'rgba(255,255,255,0.35)' }}>{ch.name} {ch.charity_number && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>#{ch.charity_number}</span>}</p>
                {ch.description && <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{ch.description}</p>}
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{ch.total_scores_donated.toLocaleString()} Scores donated · £{(ch.total_donated_pence / 100).toFixed(2)} processed</p>
              </div>
              <button onClick={() => handleToggle(ch.id, ch.is_active)} style={{ background: ch.is_active ? 'rgba(255,255,255,0.06)' : '#9b1c1c', color: ch.is_active ? 'rgba(255,255,255,0.5)' : '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>{ch.is_active ? 'Deactivate' : 'Activate'}</button>
            </div>
          ))}
        </div>
      </section>

      {/* Pending */}
      <section>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 14px', fontFamily: "'Syne', sans-serif" }}>Pending Donations</h2>
        {pending.length === 0 ? <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>No unbatched donations at the moment.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pending.map(group => (
              <div key={group.charity.id} style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff' }}>{group.charity.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{group.donation_count} donation{group.donation_count !== 1 ? 's' : ''} · {group.total_scores.toLocaleString()} Scores · £{(group.total_pence / 100).toFixed(2)}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" value={batchRef[group.charity.id] ?? ''} onChange={e => setBatchRef({ ...batchRef, [group.charity.id]: e.target.value })} placeholder="Transaction reference *" style={{ ...iStyle, flex: 1, minWidth: '160px' }} />
                  <button onClick={() => handleProcessBatch(group.charity.id)} disabled={isPendingBatch} style={{ ...btnPrimary, whiteSpace: 'nowrap' }}>{isPendingBatch ? 'Processing…' : 'Process batch'}</button>
                </div>
                {batchMsg[group.charity.id] && <p style={{ margin: 0, fontSize: '12px', color: batchMsg[group.charity.id].includes('success') ? '#4ade80' : '#f87171' }}>{batchMsg[group.charity.id]}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Batches */}
      <section>
        <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '0 0 14px', fontFamily: "'Syne', sans-serif" }}>Past Donation Batches</h2>
        {batches.length === 0 ? <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>No batches processed yet.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr>{['Charity','Scores','£ total','Reference','Date'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
              <tbody>
                {batches.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px', color: '#fff' }}>{charities.find(c => c.id === b.charity_id)?.name ?? b.charity_id.slice(0, 8)}</td>
                    <td style={{ padding: '10px', color: 'rgba(255,255,255,0.6)' }}>{b.total_scores.toLocaleString()}</td>
                    <td style={{ padding: '10px', color: '#9b1c1c', fontWeight: 600 }}>£{(b.total_pence / 100).toFixed(2)}</td>
                    <td style={{ padding: '10px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: '12px' }}>{b.transaction_reference ?? '—'}</td>
                    <td style={{ padding: '10px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{new Date(b.processed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
