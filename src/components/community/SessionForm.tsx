'use client';

import { useState, useTransition } from 'react';
import { createSessionAction } from '@/lib/actions/community-social';

const field = { width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: 'inherit', marginBottom: 10 } as const;

export function SessionForm({ clubs, canHostJunior, adults }: { clubs: Array<{ id: string; name: string }>; canHostJunior: boolean; adults: Array<{ id: string; name: string; clubId: string }> }) {
  const [v, setV] = useState({ kind: 'nets', band: 'adult', clubId: clubs[0]?.id ?? '', title: '', note: '', place: '', startsAt: '', capacity: 6, responsibleAdultId: '' });
  // Only adults at the chosen club who currently hold an enhanced DBS check are offered. The server checks again.
  const choices = adults.filter((a) => a.clubId === v.clubId);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => {
      const r = await createSessionAction({ ...v, startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : '' });
      setNote(r.success ? (r.message ?? 'Done.') : (r.error ?? 'Could not create.'));
    }); }}>
      <select style={field} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}><option value="nets">Nets</option><option value="pickup">Pick-up game</option></select>
      {canHostJunior && <select style={field} value={v.band} onChange={(e) => setV({ ...v, band: e.target.value })}><option value="adult">For adults</option><option value="junior">For juniors at my club</option></select>}
      {clubs.length > 1 && <select style={field} value={v.clubId} onChange={(e) => setV({ ...v, clubId: e.target.value, responsibleAdultId: '' })}>{clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
      {v.band === 'junior' && (choices.length > 0 ? (
        <label>Responsible adult (current enhanced DBS check)
          <select style={field} required value={v.responsibleAdultId} onChange={(e) => setV({ ...v, responsibleAdultId: e.target.value })}>
            <option value="">Choose who is responsible</option>
            {choices.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
      ) : <p role="alert">A junior session needs a named adult from your club with a current enhanced DBS check recorded. Nobody at this club qualifies yet. Ask ShiftUp to record the check.</p>)}
      <input style={field} placeholder="Title" maxLength={80} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
      <input style={field} placeholder="Where (club ground or public venue)" maxLength={120} value={v.place} onChange={(e) => setV({ ...v, place: e.target.value })} />
      <input style={field} type="datetime-local" value={v.startsAt} onChange={(e) => setV({ ...v, startsAt: e.target.value })} />
      <input style={field} type="number" min={2} max={30} value={v.capacity} onChange={(e) => setV({ ...v, capacity: Number(e.target.value) })} />
      <textarea style={{ ...field, minHeight: 60 }} placeholder="Anything people should know" maxLength={300} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} />
      <button type="submit" disabled={pending} style={{ background: '#60A5FA', color: '#0B1220', border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}>{pending ? 'Checking…' : 'Create session'}</button>
      {note && <p role="status">{note}</p>}
    </form>
  );
}
