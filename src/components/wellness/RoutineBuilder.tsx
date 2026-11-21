'use client';

import { useState, useTransition } from 'react';
import { saveMyRoutine, setChecklistTick } from '@/lib/actions/wellness';
import { MATCH_DAY_CHECKLISTS } from '@/lib/wellness/content';

const TEXT = new Map(MATCH_DAY_CHECKLISTS.flatMap((c) => c.items.map((i) => [i.id, i.text] as const)));

export function RoutineBuilder({ initialIds, initialTicks }: { initialIds: string[]; initialTicks: string[] }) {
  const [ids, setIds] = useState(new Set(initialIds));
  const [saved, setSaved] = useState(initialIds);
  const [ticks, setTicks] = useState(new Set(initialTicks));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div>
      <h2>My routine today</h2>
      {saved.length === 0 ? <p>Pick the steps you want below, then save.</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {saved.map((id) => <li key={id}><label><input type="checkbox" checked={ticks.has(id)} onChange={(e) => {
            const on = e.target.checked; setTicks((t) => { const n = new Set(t); if (on) n.add(id); else n.delete(id); return n; });
            start(async () => { const r = await setChecklistTick(id, on); if (!r.success) setMsg(r.error); });
          }} /> {TEXT.get(id)}</label></li>)}
        </ul>
      )}
      <h2>Choose your steps</h2>
      {MATCH_DAY_CHECKLISTS.map((c) => (
        <fieldset key={c.id} style={{ border: 0, padding: 0, marginBottom: 12 }}>
          <legend><strong>{c.title}</strong></legend>
          {c.items.map((i) => <div key={i.id}><label><input type="checkbox" checked={ids.has(i.id)} onChange={(e) => setIds((s) => { const n = new Set(s); if (e.target.checked) n.add(i.id); else n.delete(i.id); return n; })} /> {i.text}</label></div>)}
        </fieldset>
      ))}
      <button type="button" disabled={pending} onClick={() => start(async () => {
        // Keep the order of the checklists
        const ordered = MATCH_DAY_CHECKLISTS.flatMap((c) => c.items.map((i) => i.id)).filter((id) => ids.has(id));
        const r = await saveMyRoutine(ordered);
        if (r.success) { setSaved(ordered); setMsg('Saved.'); } else setMsg(r.error);
      })} style={{ background: '#F472B6', color: '#0B1220', border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}>Save my routine</button>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}
