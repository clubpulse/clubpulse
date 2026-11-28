'use client';

import { useState, useTransition } from 'react';
import { resolveSquadFlagAction } from '@/lib/actions/squad-flags';
import type { OpenFlag } from '@/lib/age-verification/flags';
import { cardTitle, muted } from '@/components/play/ui';
import { PLAYER_DOB_HOLD } from '@/lib/age-verification/rules';

export function SquadFlagList({ clubId, items, error }: { clubId: string; items: OpenFlag[]; error?: string }) {
  const [left, setLeft] = useState(items);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section>
      <h3 style={cardTitle}>Open squad flags</h3>
      <p style={muted}>A welfare officer with a current DBS check can close a flag. The player is told: {PLAYER_DOB_HOLD}</p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {left.length === 0 && !error && <p style={muted}>No open flags.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
        {left.map((flag) => (
          <li key={flag.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <span><strong>{flag.playerName}</strong> · {flag.ageGroup} · {flag.reason === 'mismatch' ? 'Age band does not match' : 'Date of birth is not confirmed'}</span>
            <button type="button" disabled={pending} onClick={() => start(async () => {
              const result = await resolveSquadFlagAction(clubId, flag.id);
              if (result.success) setLeft((rows) => rows.filter((row) => row.id !== flag.id));
              setMessage(result.success ? 'Flag closed.' : result.error);
            })}>Resolve</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
