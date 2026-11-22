'use client';

import { useState, useTransition } from 'react';
import { askParentAction } from '@/lib/actions/community-social';

/** A coach or club admin asking a young person's parent if they may connect. Nothing reaches the young person first. */
export function AskParentForm({ juniorId, name }: { juniorId: string; name: string }) {
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await askParentAction(juniorId, note); setMsg(r.success ? (r.message ?? 'Sent.') : (r.error ?? 'Could not send.')); if (r.success) setNote(''); }); }}
      style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
      <strong>Ask {name}’s parent</strong>
      <p style={{ fontSize: 14, opacity: 0.8, margin: '4px 0 8px' }}>As their coach you can ask to message them. Their parent decides first and can read the conversation.</p>
      <textarea value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="A short note to their parent (optional)" aria-label="Note to their parent"
        style={{ width: '100%', minHeight: 60, padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: 'inherit', marginBottom: 8 }} />
      <button type="submit" disabled={pending} style={{ background: '#60A5FA', color: '#0B1220', border: 0, borderRadius: 10, padding: '8px 14px', fontWeight: 600 }}>{pending ? 'Sending…' : 'Ask their parent'}</button>
      {msg && <p role="status">{msg}</p>}
    </form>
  );
}
