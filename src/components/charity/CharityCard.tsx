'use client';

import { useState, useTransition } from 'react';
import type { ClubCharity, CharitySettings } from '@/lib/types/charity';
import { donateToCharity } from '@/lib/actions/charity';

interface Props {
  charity: ClubCharity;
  settings: CharitySettings;
}

export function CharityCard({ charity, settings }: Props) {
  const [scores, setScores] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const numScores = parseInt(scores, 10) || 0;
  const penceValue = settings.scores_per_pound > 0 ? Math.floor((numScores * 100) / settings.scores_per_pound) : 0;
  const poundsDisplay = (penceValue / 100).toFixed(2);
  const totalRaisedPounds = (charity.total_scores_donated / settings.scores_per_pound).toFixed(2);

  function handleDonate() {
    if (numScores < 100) { setResult({ ok: false, text: 'Minimum donation is 100 Scores.' }); return; }
    startTransition(async () => {
      setResult(null);
      const res = await donateToCharity(charity.id, numScores, message.trim() || undefined);
      if (res.success) {
        setResult({ ok: true, text: `Thank you! You donated ${res.data.scores_donated.toLocaleString()} Scores (£${res.data.pounds.toFixed(2)} equivalent)` });
        setScores(''); setMessage('');
      } else {
        setResult({ ok: false, text: res.error });
      }
    });
  }

  return (
    <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff', fontFamily: "'Syne', sans-serif" }}>{charity.name}</h3>
          {charity.charity_number && <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Reg. {charity.charity_number}</p>}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#9b1c1c' }}>£{totalRaisedPounds}</p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>raised via Scores</p>
        </div>
      </div>
      {charity.description && <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{charity.description}</p>}
      {charity.website_url && <a href={charity.website_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#9b1c1c', textDecoration: 'none' }}>Visit website ↗</a>}
      {settings.is_enabled ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Scores to donate (min 100)</label>
              <input type="number" min={100} step={100} value={scores} onChange={e => setScores(e.target.value)} placeholder="e.g. 500" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 10px', fontSize: '14px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {numScores >= 100 && <div style={{ paddingBottom: '1px', fontSize: '13px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>= £{poundsDisplay}</div>}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Message (optional)</label>
            <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder='"In memory of...", "Match day donation"' maxLength={120} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button onClick={handleDonate} disabled={isPending || numScores < 100} style={{ background: numScores >= 100 ? '#9b1c1c' : 'rgba(255,255,255,0.06)', color: numScores >= 100 ? '#fff' : 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: numScores >= 100 ? 'pointer' : 'default', transition: 'background 0.15s', fontFamily: "'Inter', sans-serif" }}>
            {isPending ? 'Donating…' : numScores >= 100 ? `Donate ${numScores.toLocaleString()} Scores (= £${poundsDisplay})` : 'Enter amount to donate'}
          </button>
          {result && <p style={{ margin: 0, fontSize: '13px', color: result.ok ? '#4ade80' : '#f87171', lineHeight: 1.4 }}>{result.ok ? '❤️ ' : ''}{result.text}</p>}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Donations are currently paused by your club admin.</p>
      )}
    </div>
  );
}
