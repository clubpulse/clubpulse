// Server-only. A player's own paid plan: what they can buy, checkout, and managing it.
// The caller has already verified the user id.

import { getStripe } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPrimaryClubId } from '@/lib/scores/context';
import type { SubscriptionTier } from '@/lib/types/subscription';
import { isLive, isPlayerPlan, lookupKey, offerFor, type Offer, type PlanKind, type PlayerPlan } from '@/lib/billing/player-plans';

const SITE = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://clubpulse.co').replace(/\/$/, '');

/** Online payment stays off until this is set to "on" in Vercel. The Stripe key there is a live one. */
export const playerCheckoutEnabled = (): boolean => process.env.NEXT_PUBLIC_PLAYER_CHECKOUT === 'on';

export type CurrentPlan = {
  plan: PlayerPlan;
  kind: PlanKind;
  status: string;
  pence: number | null;
  renews: string | null;
  endsAtPeriodEnd: boolean;
};
export type PlayerPlanView = {
  enabled: boolean;
  /** A junior cannot buy: a parent or guardian does it for them. */
  junior: boolean;
  offer: Offer;
  current: CurrentPlan | null;
};

type Row = {
  plan: string | null; kind: string | null; status: string; price_pence: number | null;
  stripe_customer_id: string | null; current_period_end: string | null; cancel_at_period_end: boolean;
};

async function loadOffer(userId: string): Promise<{ offer: Offer; junior: boolean }> {
  const admin = createAdminClient();
  const clubId = await getPrimaryClubId(userId);
  const [{ data: junior }, { data: club }] = await Promise.all([
    admin.from('club_members').select('club_id').eq('user_id', userId).eq('is_junior', true).limit(1),
    clubId
      ? admin.from('club_subscriptions').select('tier, status').eq('club_id', clubId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const tier = (club?.tier as SubscriptionTier | undefined) ?? null;
  return { offer: offerFor(tier, isLive(club?.status as string | undefined)), junior: (junior ?? []).length > 0 };
}

async function loadRow(userId: string): Promise<Row | null> {
  const { data } = await createAdminClient()
    .from('player_subscriptions')
    .select('plan, kind, status, price_pence, stripe_customer_id, current_period_end, cancel_at_period_end')
    .eq('user_id', userId)
    .maybeSingle();
  return (data as Row | null) ?? null;
}

export async function getPlayerPlan(userId: string): Promise<PlayerPlanView> {
  const [{ offer, junior }, row] = await Promise.all([loadOffer(userId), loadRow(userId)]);
  const current: CurrentPlan | null =
    row && isLive(row.status) && isPlayerPlan(row.plan) && (row.kind === 'individual' || row.kind === 'club_addon')
      ? { plan: row.plan, kind: row.kind, status: row.status, pence: row.price_pence, renews: row.current_period_end, endsAtPeriodEnd: row.cancel_at_period_end }
      : null;
  return { enabled: playerCheckoutEnabled(), junior, offer, current };
}

type Result = { ok: true; url: string } | { ok: false; error: string; status: number };

/** Starts a monthly card subscription in Stripe Checkout and returns the page to send the player to. */
export async function createPlayerCheckout(userId: string, email: string | null, plan: unknown): Promise<Result> {
  if (!playerCheckoutEnabled()) return { ok: false, error: 'Online payment is not open yet.', status: 403 };
  if (!isPlayerPlan(plan)) return { ok: false, error: 'Choose a plan.', status: 400 };

  const [{ offer, junior }, row] = await Promise.all([loadOffer(userId), loadRow(userId)]);
  if (junior) return { ok: false, error: 'Ask your parent or guardian to do this for you.', status: 403 };
  if (row && isLive(row.status)) return { ok: false, error: 'You already have a plan. Use "Manage my plan" to change or cancel it.', status: 409 };

  const option = offer.options.find((o) => o.plan === plan);
  if (!option) return { ok: false, error: 'That plan is not available to you.', status: 400 };

  const stripe = getStripe();
  const admin = createAdminClient();

  let customerId = row?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: email ?? undefined, metadata: { user_id: userId, platform: 'clubpulse', type: 'player' } });
    customerId = customer.id;
    await admin.from('player_subscriptions').upsert({ user_id: userId, stripe_customer_id: customerId, status: 'none' }, { onConflict: 'user_id' });
  }

  // One price per kind, plan and amount. `list` by lookup key is immediate; `search` lags by up to a minute.
  const key = lookupKey(offer.kind, option.plan, option.pence);
  const found = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  let priceId = found.data[0]?.id;
  if (!priceId) {
    const product = await stripe.products.create({
      name: `ClubPulse ${option.label}`,
      metadata: { platform: 'clubpulse', type: 'player', kind: offer.kind, plan: option.plan },
    });
    const price = await stripe.prices.create({
      product: product.id, unit_amount: option.pence, currency: 'gbp', recurring: { interval: 'month' }, lookup_key: key,
    });
    priceId = price.id;
  }

  const metadata = { type: 'player_subscription', user_id: userId, plan: option.plan, kind: offer.kind, price_pence: String(option.pence) };
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${SITE}/plan?paid=1`,
    cancel_url: `${SITE}/plan`,
    metadata,
    subscription_data: { metadata },
  });
  if (!session.url) return { ok: false, error: 'Could not start the payment. Please try again.', status: 502 };
  return { ok: true, url: session.url };
}

/** Stripe's own page for changing the card, seeing invoices or cancelling. */
export async function createPlayerPortal(userId: string): Promise<Result> {
  const row = await loadRow(userId);
  if (!row?.stripe_customer_id) return { ok: false, error: 'You do not have a plan to manage.', status: 404 };
  const session = await getStripe().billingPortal.sessions.create({ customer: row.stripe_customer_id, return_url: `${SITE}/plan` });
  return { ok: true, url: session.url };
}
