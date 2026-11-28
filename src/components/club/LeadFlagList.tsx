'use client';

import { useState, useTransition } from 'react';
import { resolveSquadFlagAction } from '@/lib/actions/squad-flags';
import type { LeadFlag } from '@/lib/age-verification/lead';
import { card, cardTitle, muted } from '@/components/play/ui';

export function LeadFlagList({ items, error }: { items: LeadFlag[]; error?: string }) {
  const [left, setLeft] = useState(items);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <section aria-label="Flags at clubs with no welfare officer">
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {!error && left.length === 0 && <p style={muted}>No open flags need you.</p>}
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 12 }}>
        {left.map((flag) => (
          <li key={flag.id} style={card}>
            <h3 style={cardTitle}>{flag.clubName}</h3>
            <p>
              <strong>{flag.playerName}</strong> · {flag.ageGroup} squad · {flag.reason === 'mismatch' ? 'Age band does not match' : 'Date of birth is not confirmed'}
            </p>
            <p style={muted}>Raised {flag.createdAt.slice(0, 10)} · open {flag.daysOpen} day{flag.daysOpen === 1 ? '' : 's'} · reference {flag.id}</p>
            <label style={{ display: 'grid', gap: 4 }}>
              <span style={muted}>Why you are closing it (required)</span>
              <textarea
                rows={2}
                value={notes[flag.id] ?? ''}
                onChange={(e) => setNotes((n) => ({ ...n, [flag.id]: e.target.value }))}
                placeholder="For example: club admin confirmed the date of birth from the registration form"
              />
            </label>
            <button
              type="button"
              disabled={pending || !(notes[flag.id] ?? '').trim()}
              onClick={() => start(async () => {
                const result = await resolveSquadFlagAction(flag.clubId, flag.id, notes[flag.id]);
                if (result.success) setLeft((rows) => rows.filter((row) => row.id !== flag.id));
                setMessage(result.success ? 'Flag closed and recorded.' : result.error);
              })}
            >Close flag</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
