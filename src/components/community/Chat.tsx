'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { blockAction, reportMessageAction, sendMessageAction } from '@/lib/actions/community-social';
import { ActionButton, ReportButton } from './ui';

type Msg = { id: string; body: string; createdAt: string; mine: boolean };

/** A private conversation. New messages arrive by asking again every few seconds while the page is open. */
export function Chat({ connectionId, personId, personName, messages }: { connectionId: string; personId: string; personName: string; messages: Msg[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [tell, setTell] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setInterval(() => router.refresh(), 8000); return () => clearInterval(t); }, [router]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);

  const send = () => {
    if (!draft.trim() || pending) return;
    start(async () => {
      const r = await sendMessageAction(connectionId, draft);
      if (!r.success) { setTell(r.error ?? 'Could not send.'); return; }
      if (r.delivered) { setDraft(''); setTell(null); router.refresh(); } else setTell(r.message ?? 'This was not delivered.');
    });
  };

  return (
    <div>
      <p style={{ fontSize: 13, opacity: 0.7 }}>Every message is read by our safety check before it is delivered. If anything feels wrong, report it or block {personName}.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0' }} aria-live="polite">
        {messages.length === 0 && <p style={{ opacity: 0.7 }}>No messages yet. Say hello.</p>}
        {messages.map((m) => (
          <div key={m.id} style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
            <div style={{ background: m.mine ? '#60A5FA' : 'rgba(255,255,255,0.08)', color: m.mine ? '#0B1220' : 'inherit', borderRadius: 14, padding: '8px 12px', whiteSpace: 'pre-wrap' }}>{m.body}</div>
            {!m.mine && <div style={{ marginTop: 4 }}><ReportButton run={(reason) => reportMessageAction(m.id, reason)} /></div>}
          </div>
        ))}
        <div ref={end} />
      </div>
      {tell && <p role="alert" style={{ color: '#FBBF24' }}>{tell}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} style={{ display: 'flex', gap: 8 }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} placeholder={`Message ${personName}`} aria-label="Write a message"
          style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: 'inherit' }} />
        <button type="submit" disabled={pending || !draft.trim()} style={{ background: '#60A5FA', color: '#0B1220', border: 0, borderRadius: 10, padding: '8px 16px', fontWeight: 600 }}>{pending ? 'Sending…' : 'Send'}</button>
      </form>
      <p style={{ marginTop: 24 }}><ActionButton quiet label={`Block ${personName}`} confirm={`Block ${personName}? You will not see each other again.`} run={() => blockAction(personId)} /></p>
    </div>
  );
}
