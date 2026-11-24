import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { getPlayerPlan } from '@/lib/billing/player';
import { PLAYER_PLANS, pounds } from '@/lib/billing/player-plans';
import { ManagePlanButton, PlanOptions } from '@/components/plan/PlanOptions';
import { card, cardTitle, h1, muted } from '@/components/play/ui';
import { formatDate } from '@/lib/utils/format';

export const metadata = { title: 'My plan' };

// A player's own paid plan. Clubs do not pay here: they contact us and sign an agreement.
export default async function PlanPage({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const user = await requireUser();
  const [{ paid }, view] = await Promise.all([searchParams, getPlayerPlan(user.id)]);
  const { current, offer } = view;

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ ...h1, fontSize: '22px', marginBottom: '2px' }}>My plan</h1>
        <p style={muted}>
          {offer.kind === 'club_addon'
            ? 'Your club is on a SHIFTUP plan. Add analysis on your own phone, with coaching and AI analysis sessions.'
            : 'Choose a plan for yourself. You can change or cancel it at any time.'}
        </p>
      </div>

      {paid && !current && (
        <div style={card}>
          <p style={cardTitle}>Thank you</p>
          <p style={muted}>Your payment is being confirmed. This usually takes a few seconds: refresh this page shortly.</p>
        </div>
      )}

      {current ? (
        <div style={{ ...card, borderColor: '#EFC84A' }}>
          <p style={cardTitle}>
            {PLAYER_PLANS[current.plan].label}{current.kind === 'club_addon' ? ' member add-on' : ''}
            {current.pence ? ` · ${pounds(current.pence)} a month` : ''}
          </p>
          <p style={{ ...muted, marginBottom: '12px' }}>
            {current.status === 'past_due'
              ? 'Your last payment did not go through. Update your card to keep your plan.'
              : current.endsAtPeriodEnd
                ? `Cancelled. You keep your plan until ${current.renews ? formatDate(current.renews) : 'the end of the month you have paid for'}.`
                : current.renews ? `Renews on ${formatDate(current.renews)}.` : 'Active.'}
          </p>
          <ManagePlanButton />
        </div>
      ) : view.junior ? (
        <div style={card}>
          <p style={cardTitle}>Junior account</p>
          <p style={muted}>A parent or guardian needs to choose and pay for a plan. Ask them to sign in to their own account.</p>
        </div>
      ) : view.enabled ? (
        <PlanOptions offer={offer} />
      ) : (
        <div style={card}>
          <p style={cardTitle}>Online payment opens soon</p>
          <p style={muted}>
            Until then, <Link href="/contact" style={{ color: '#60A5FA' }}>tell us which plan you would like</Link> and we will set it up for you.
          </p>
        </div>
      )}

      <p style={muted}>
        Individual players can ask for a refund within 14 days: see our <Link href="/refunds" style={{ color: '#60A5FA' }}>refund policy</Link>.
        Clubs do not pay here. <Link href="/contact" style={{ color: '#60A5FA' }}>Contact us</Link> about a club plan.
      </p>
    </div>
  );
}
