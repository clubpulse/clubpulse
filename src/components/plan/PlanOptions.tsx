'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { card, cardTitle, muted, pill } from '@/components/play/ui';
import { pounds, type Offer, type PlayerPlan } from '@/lib/billing/player-plans';
import { BILLING_TERMS, defaultTerm, penceFor, type BillingTerm } from '@/lib/billing/member-pricing';

async function go(path: string, body?: unknown) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.url) throw new Error(json.error ?? 'Something went wrong. Please try again.');
  window.location.assign(json.url as string);
}

export function PlanOptions({ offer, under18 = false, terms = false }: { offer: Offer; under18?: boolean; terms?: boolean }) {
  const [busy, setBusy] = useState<PlayerPlan | null>(null);
  const [term, setTerm] = useState<BillingTerm>(defaultTerm(under18));
  const memberRate = offer.kind === 'club_member';

  const choose = async (plan: PlayerPlan) => {
    setBusy(plan);
    try { await go('/api/player/plan', terms ? { plan, term } : { plan }); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Something went wrong.'); setBusy(null); }
  };

  const period = term === 'year' ? 'a year' : term === 'quarter' ? 'a quarter' : 'a month';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      {terms && (
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
          {BILLING_TERMS.map((choice) => (
            <button key={choice} type="button" onClick={() => setTerm(choice)} aria-pressed={term === choice}>
              {choice === 'month' ? 'Monthly' : choice === 'quarter' ? 'Quarterly' : 'Annual'}
            </button>
          ))}
        </div>
      )}
      {offer.options.map((o) => (
        <div key={o.plan} style={card}>
          <p style={cardTitle}>{o.label}</p>
          <p style={{ margin: '4px 0 0', fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 800, fontSize: '28px', color: '#fff' }}>
            {pounds(terms ? penceFor(o.plan, memberRate, term) : o.pence)}<span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.5)' }}> {period}</span>
          </p>
          <button type="button" onClick={() => choose(o.plan)} disabled={busy !== null} style={{ ...pill('gold', busy !== null), marginTop: '16px' }}>
            {busy === o.plan ? 'Opening…' : 'Pay by card'}
          </button>
        </div>
      ))}
      <p style={{ ...muted, gridColumn: '1 / -1' }}>
        Paid monthly by card and renews each month until you cancel. You can cancel at any time from this page.
        Payment is taken securely by Stripe; SHIFTUP never sees your card number.
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
