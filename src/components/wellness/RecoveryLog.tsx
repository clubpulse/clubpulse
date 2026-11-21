'use client';

import { useState, useTransition } from 'react';
import { saveRecovery, deleteRecovery, type RecoveryRow } from '@/lib/actions/wellness';
import { soundsSerious, SERIOUS_NUDGE, MAX_ACTIVITY, MAX_RECOVERY_NOTE } from '@/lib/wellness/trend';

const field = { width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: 'inherit', marginBottom: 10 } as const;

export function RecoveryLog({ rows }: { rows: RecoveryRow[] }) {
  const [soreness, setSoreness] = useState<number | null>(null);
  const [activity, setActivity] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const serious = soundsSerious(`${activity} ${notes}`);
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveRecovery({ soreness, activity, notes }); setMsg(r.success ? 'Saved for today.' : r.error); if (r.success) { setActivity(''); setNotes(''); } }); }}>
        <fieldset style={{ border: 0, padding: 0, margin: '0 0 10px' }}>
          <legend>How sore are you today? (1 very sore, 5 fresh)</legend>
          {[1, 2, 3, 4, 5].map((n) => <label key={n} style={{ marginRight: 12 }}><input type="radio" name="soreness" checked={soreness === n} onChange={() => setSoreness(n)} /> {n}</label>)}
        </fieldset>
        <input style={field} placeholder="What did you do? (rest, walk, stretching…)" maxLength={MAX_ACTIVITY} value={activity} onChange={(e) => setActivity(e.target.value)} />
        <textarea style={{ ...field, minHeight: 70 }} placeholder="Notes, only you see these" maxLength={MAX_RECOVERY_NOTE} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {serious && <p role="alert" style={{ padding: 12, borderRadius: 10, border: '1px solid #FBBF24' }}>{SERIOUS_NUDGE}</p>}
        <button type="submit" disabled={pending} style={{ background: '#F472B6', color: '#0B1220', border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}>{pending ? 'Saving…' : 'Save today'}</button>
        {msg && <p role="status">{msg}</p>}
      </form>
      <h2>Earlier entries</h2>
      {rows.length === 0 && <p>Nothing logged yet.</p>}
      {rows.map((r) => (
        <div key={r.id} style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <strong>{r.date}</strong>{r.soreness ? ` · soreness ${r.soreness}/5` : ''}
          {r.activity && <div>{r.activity}</div>}{r.notes && <div style={{ opacity: 0.8 }}>{r.notes}</div>}
          <button type="button" onClick={() => start(async () => { await deleteRecovery(r.id); })} style={{ background: 'none', border: 0, color: '#F472B6', cursor: 'pointer', padding: 0 }}>Delete</button>
        </div>
      ))}
    </div>
  );
}
