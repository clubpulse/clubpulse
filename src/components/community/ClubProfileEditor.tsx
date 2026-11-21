'use client';

import { useState, useTransition } from 'react';

type V = { headline: string; about: string; netsNotes: string };
export function ClubProfileEditor({ initial, onSave }: { initial: V; onSave: (v: V) => Promise<{ success: boolean; error?: string; message?: string }> }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const field = { width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: 'inherit', marginBottom: 12 } as const;
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await onSave(v); setNote(r.success ? (r.message ?? 'Saved.') : (r.error ?? 'Could not save.')); }); }}>
      <label>Headline<input style={field} maxLength={80} value={v.headline} onChange={(e) => setV({ ...v, headline: e.target.value })} /></label>
      <label>About the club<textarea style={{ ...field, minHeight: 80 }} maxLength={600} value={v.about} onChange={(e) => setV({ ...v, about: e.target.value })} /></label>
      <label>Nets notes<textarea style={{ ...field, minHeight: 60 }} maxLength={300} value={v.netsNotes} onChange={(e) => setV({ ...v, netsNotes: e.target.value })} /></label>
      <button type="submit" disabled={pending} style={{ background: '#60A5FA', color: '#0B1220', border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}>{pending ? 'Saving…' : 'Save'}</button>
      {note && <p role="status">{note}</p>}
    </form>
  );
}
