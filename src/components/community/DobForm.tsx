'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveDateOfBirth } from '@/lib/actions/date-of-birth';

export function DobForm() {
  const router = useRouter();
  const [dob, setDob] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await saveDateOfBirth(dob);
          if (!r.success) setError(r.error); else router.refresh();
        });
      }}
      style={{ display: 'grid', gap: 12, maxWidth: 360 }}
    >
      <label style={{ display: 'grid', gap: 6 }}>
        <span>Date of birth</span>
        <input type="date" required max={today} value={dob} onChange={(e) => setDob(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'inherit' }} />
      </label>
      {error && <p role="alert" style={{ color: '#f87171', margin: 0 }}>{error}</p>}
      <button type="submit" disabled={pending || !dob} style={{ padding: '10px 14px', borderRadius: 8, border: 0, background: '#60a5fa', color: '#0a0a0a', fontWeight: 600 }}>
        {pending ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
