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
