'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createPlanAction } from '@/lib/actions/academy';
import { ROLES } from '@/lib/academy/logic';

const field = { width: '100%', padding: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: 'inherit', marginBottom: 10 } as const;

export function PlanForm({ left }: { left: number }) {
  const [v, setV] = useState({ focus: '', role: 'new', sessions: 3, minutes: 30 });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form onSubmit={(e) => { e.preventDefault(); start(async () => { setError(null); const r = await createPlanAction(v); if (r.ok) router.refresh(); else setError(r.error); }); }}>
      <input style={field} placeholder="What do you want to get better at?" maxLength={200} value={v.focus} onChange={(e) => setV({ ...v, focus: e.target.value })} />
      <select style={field} value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{r === 'new' ? 'New to cricket' : r}</option>)}</select>
      <select style={field} value={v.sessions} onChange={(e) => setV({ ...v, sessions: Number(e.target.value) })}>{[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} sessions a week</option>)}</select>
      <select style={field} value={v.minutes} onChange={(e) => setV({ ...v, minutes: Number(e.target.value) })}>{[15, 30, 45].map((n) => <option key={n} value={n}>{n} minutes a session</option>)}</select>
      <button type="submit" disabled={pending || left < 1} style={{ background: '#2DD4BF', color: '#0B1220', border: 0, borderRadius: 10, padding: '10px 16px', fontWeight: 600 }}>{pending ? 'Making your plan…' : 'Make my plan'}</button>
      <p style={{ fontSize: 13, opacity: 0.8 }}>{left} plan{left === 1 ? '' : 's'} left this week.</p>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
