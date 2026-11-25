'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { connectPlayCricket, disconnectPlayCricket, type PlayCricketStatus } from '@/lib/actions/playcricket';
import { card, cardTitle, muted } from '@/components/play/ui';

export function PlayCricketCard({ clubId, status }: { clubId: string; status: PlayCricketStatus }) {
  const router = useRouter();
  const [siteId, setSiteId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!status.enabled) {
    return (
      <section style={card}>
        <h2 style={cardTitle}>Play-Cricket</h2>
        <p style={muted}>Connecting a club Play-Cricket key is not open yet.</p>
      </section>
    );
  }

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await connectPlayCricket(clubId, siteId, apiKey);
    setPending(false);
    setApiKey('');
    if (!result.success) { setMessage(result.error); return; }
    setSiteId('');
    router.refresh();
  };

  const disconnect = async () => {
    setPending(true);
    const result = await disconnectPlayCricket(clubId);
    setPending(false);
    if (!result.success) { setMessage(result.error); return; }
    router.refresh();
  };

  return (
    <section style={card}>
      <h2 style={cardTitle}>Play-Cricket</h2>
      <p style={muted}>
        Each club uses its own site ID and API key. SHIFTUP stores the key encrypted and does not show it again.
        The sync runs overnight and once after matches. It is not live scoring.
      </p>
      <ol style={{ ...muted, paddingLeft: 18 }}>
        <li>A club admin emails play.cricket@ecb.co.uk with the club name, the Play-Cricket site URL, their role, and that the key is for SHIFTUP to copy fixtures and results into the club&apos;s own account.</li>
        <li>Paste the site ID and the key below. The key is not shared with any other club.</li>
        <li>Disconnect deletes the key and the cached fixtures. To rotate a key, disconnect and connect the new one.</li>
      </ol>
      {status.connected ? (
        <div>
          <p style={muted}>Connected for site {status.siteId}. {status.lastSyncAt ? `Last sync ${status.lastSyncAt}.` : 'Not synced yet.'}</p>
          {status.lastError && <p role="alert">{status.lastError}</p>}
          <button type="button" disabled={pending} onClick={disconnect}>Disconnect and delete the key</button>
        </div>
      ) : (
        <form onSubmit={save} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
          <label>Site ID<input value={siteId} onChange={(e) => setSiteId(e.target.value)} inputMode="numeric" autoComplete="off" required /></label>
          <label>API key<input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" autoComplete="off" required /></label>
          <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Connect'}</button>
        </form>
      )}
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
