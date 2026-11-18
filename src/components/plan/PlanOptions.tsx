'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { card, cardTitle, muted, pill } from '@/components/play/ui';
import { pounds, type Offer, type PlayerPlan } from '@/lib/billing/player-plans';

async function go(path: string, body?: unknown) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error ?? 'Something went wrong. Please try again.');
  window.location.assign(json.url as string);
}

export function PlanOptions({ offer }: { offer: Offer }) {
  const [busy, setBusy] = useState<PlayerPlan | null>(null);

  const choose = async (plan: PlayerPlan) => {
    setBusy(plan);
    try { await go('/api/player/plan', { plan }); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Something went wrong.'); setBusy(null); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      {offer.options.map((o) => (
        <div key={o.plan} style={card}>
          <p style={cardTitle}>{o.label}</p>
          <p style={{ margin: '4px 0 0', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '28px', color: '#fff' }}>
            {pounds(o.pence)}<span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}> a month</span>
          </p>
          <button type="button" onClick={() => choose(o.plan)} disabled={busy !== null} style={{ ...pill('gold', busy !== null), marginTop: '16px' }}>
            {busy === o.plan ? 'Opening…' : 'Pay by card'}
          </button>
        </div>
      ))}
      <p style={{ ...muted, gridColumn: '1 / -1' }}>
        Paid monthly by card and renews each month until you cancel. You can cancel at any time from this page.
        Payment is taken securely by Stripe; ClubPulse never sees your card number.
      </p>
    </div>
  );
}

export function ManagePlanButton() {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try { await go('/api/player/plan/portal'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Something went wrong.'); setBusy(false); }
  };
  return (
    <button type="button" onClick={open} disabled={busy} style={pill('blue', busy)}>
      {busy ? 'Opening…' : 'Manage my plan'}
    </button>
  );
}
