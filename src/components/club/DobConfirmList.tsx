'use client';

import { useState, useTransition } from 'react';
import { confirmDobAction } from '@/lib/actions/dob-confirmation';
import type { DobCandidate } from '@/lib/admin/dob-confirmation';
import { cardTitle, muted } from '@/components/play/ui';

export default function DobConfirmList({ items, confirmed, error }: { items: DobCandidate[]; confirmed: number; error?: string }) {
  const [left, setLeft] = useState(items);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

  return (
    <div>
      <h3 style={cardTitle}>Confirm dates of birth ({left.length} to check)</h3>
      <p style={{ ...muted, margin: '0 0 0.75rem' }}>
        A date of birth is typed in by the family. Check each one against what the club holds (the registration form, for example) and confirm it only if it matches. {confirmed} already confirmed.
      </p>
      {error && <p role="alert" style={{ color: '#ff5252' }}>{error}</p>}
      {msg && <p role="status" style={{ color: '#00C853' }}>{msg}</p>}
      {left.length === 0 && !error && <p style={muted}>Nothing waiting.</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        {left.map((c) => (
          <li key={c.userId} style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <span>{c.name} · born {fmt(c.dob)} (age {c.age}){c.markedJunior ? ' · marked junior' : ''}</span>
            <button type="button" disabled={pending} onClick={() => start(async () => {
              const r = await confirmDobAction(c.userId, c.dob);
              if (r.success) { setLeft((l) => l.filter((x) => x.userId !== c.userId)); setMsg(r.message ?? 'Confirmed.'); } else setMsg(r.error ?? 'Could not confirm.');
            })}>Confirm</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
