/**
 * Stripe webhook event handlers.
 *
 * Handles:
 *   - checkout.session.completed  → Scores pack purchase + subscription activation
 *   - customer.subscription.*     → Subscription lifecycle
 *   - account.updated             → Connect account status changes
 */

import type Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { TIER_CONFIG, type SubscriptionTier } from '@/lib/types/subscription';

const admin = () => createAdminClient();

// ── Checkout completed ──────────────────────────────────────────────────────

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};

  if (meta.type === 'scores_pack_purchase') {
    return handleScoresPackPurchase(session);
  }

  if (meta.type === 'player_subscription') {
    return handlePlayerCheckout(session);
  }

  // Subscription checkout — handled by subscription events
  if (session.mode === 'subscription' && meta.club_id) {
    return handleSubscriptionCheckout(session);
  }
}

async function handleScoresPackPurchase(session: Stripe.Checkout.Session) {
  const purchaseId = session.metadata?.purchase_id;
  if (!purchaseId) return;

  const db = admin();

  // Mark payment as succeeded
  await db
    .from('scores_pack_purchases')
    .update({
      payment_status: 'succeeded',
      stripe_payment_intent:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null,
    })
    .eq('id', purchaseId);

  // Credit Scores to club pool via RPC
  const { data, error } = await db.rpc('credit_scores_pack', {
    p_purchase_id: purchaseId,
  });

  if (error) {
    console.error('[webhook] credit_scores_pack error:', error);
  } else {
    console.log('[webhook] Scores credited:', data);
  }
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const clubId = session.metadata?.club_id;
  const tier = (session.metadata?.tier ?? 'starter') as SubscriptionTier;
  if (!clubId) return;

  const config = TIER_CONFIG[tier];

  await admin()
    .from('club_subscriptions')
    .update({
      tier,
      status: 'active',
      stripe_customer_id:
        typeof session.customer === 'string'
          ? session.customer
          : session.customer?.id ?? null,
      stripe_subscription_id:
        typeof session.subscription === 'string'
          ? session.subscription
          : (session.subscription as Stripe.Subscription | null)?.id ?? null,
      max_members: config.maxMembers,
      max_scores_per_month: config.maxScoresPerMonth,
    })
    .eq('club_id', clubId);
}

// ── Subscription lifecycle ──────────────────────────────────────────────────

export async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  if (subscription.metadata?.type === 'player_subscription') return syncPlayerSubscription(subscription);
  const clubId = subscription.metadata?.club_id;
  if (!clubId) return;

  const tier = (subscription.metadata?.tier ?? 'starter') as SubscriptionTier;
  const config = TIER_CONFIG[tier];

  await admin()
    .from('club_subscriptions')
    .update({
      status: subscription.status as string,
      stripe_subscription_id: subscription.id,
      stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
      current_period_start: new Date(
        ((subscription as unknown as Record<string, unknown>).current_period_start as number) * 1000,
      ).toISOString(),
      current_period_end: new Date(
        ((subscription as unknown as Record<string, unknown>).current_period_end as number) * 1000,
      ).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      tier,
      max_members: config.maxMembers,
      max_scores_per_month: config.maxScoresPerMonth,
    })
    .eq('club_id', clubId);
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  if (subscription.metadata?.type === 'player_subscription') return syncPlayerSubscription(subscription, 'canceled');
  const clubId = subscription.metadata?.club_id;
  if (!clubId) return;

  // Downgrade to free tier
  const freeConfig = TIER_CONFIG.free;

  await admin()
    .from('club_subscriptions')
    .update({
      tier: 'free',
      status: 'canceled',
      cancel_at_period_end: false,
      canceled_at: new Date().toISOString(),
      max_members: freeConfig.maxMembers,
      max_scores_per_month: freeConfig.maxScoresPerMonth,
    })
    .eq('club_id', clubId);
}

// ── A player's own plan ─────────────────────────────────────────────────────

const PLAYER_PLANS = ['pro', 'elite', 'legend'];
const PLAYER_KINDS = ['individual', 'club_addon'];

async function handlePlayerCheckout(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  if (!meta.user_id || !PLAYER_PLANS.includes(meta.plan ?? '') || !PLAYER_KINDS.includes(meta.kind ?? '')) return;

  await admin().from('player_subscriptions').upsert({
    user_id: meta.user_id,
    plan: meta.plan,
    kind: meta.kind,
    status: 'active',
    price_pence: Number(meta.price_pence) || null,
    stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
    stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

/** Keeps the player's row in step with Stripe: renewals, failed cards, cancellations. */
async function syncPlayerSubscription(subscription: Stripe.Subscription, forceStatus?: string) {
  const meta = subscription.metadata ?? {};
  if (!meta.user_id) return;

  // Newer Stripe versions carry the period end on the item, older ones on the subscription
  const raw = subscription as unknown as { current_period_end?: number };
  const item = subscription.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const periodEnd = raw.current_period_end ?? item?.current_period_end ?? null;

  await admin().from('player_subscriptions').update({
    status: forceStatus ?? (subscription.status as string),
    stripe_subscription_id: subscription.id,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: forceStatus ? false : subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }).eq('user_id', meta.user_id);
}

// ── Connect account updates ─────────────────────────────────────────────────

export async function handleAccountUpdated(account: Stripe.Account) {
  const clubId = account.metadata?.club_id;
  if (!clubId) return;

  await admin()
    .from('club_stripe_accounts')
    .update({
      onboarding_complete: account.details_submitted ?? false,
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
      details_submitted: account.details_submitted ?? false,
    })
    .eq('club_id', clubId);
}

// ── Checkout session expired ────────────────────────────────────────────────

export async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const purchaseId = session.metadata?.purchase_id;
  if (!purchaseId) return;

  await admin()
    .from('scores_pack_purchases')
    .update({ payment_status: 'failed' })
    .eq('id', purchaseId)
    .eq('payment_status', 'pending');
}
