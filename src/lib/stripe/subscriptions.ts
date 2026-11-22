/**
 * Club subscription checkout + management via Stripe Billing.
 *
 * Subscriptions run on the platform account (not the connected account).
 * The club's Stripe customer is created here, separate from the Connect account.
 */

import { getStripe } from './client';
import { createAdminClient } from '@/lib/supabase/admin';
import { TIER_CONFIG, type SubscriptionTier } from '@/lib/types/subscription';

const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://shiftup.club';

/**
 * Create a Stripe Checkout session for a club subscription upgrade.
 * Returns the checkout URL.
 */
export async function createSubscriptionCheckout(
  clubId: string,
  tier: SubscriptionTier,
  billingCycle: 'monthly' | 'annual',
  adminEmail: string,
): Promise<string> {
  if (tier === 'free') throw new Error('Cannot checkout for the free tier');

  const stripe = getStripe();
  const admin = createAdminClient();
  const config = TIER_CONFIG[tier];

  // Get or create Stripe customer for this club
  const { data: sub } = await admin
    .from('club_subscriptions')
    .select('stripe_customer_id')
    .eq('club_id', clubId)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id;

  if (!customerId) {
    // Fetch club name
    const { data: club } = await admin
      .from('clubs')
      .select('name')
      .eq('id', clubId)
      .maybeSingle();

    const customer = await stripe.customers.create({
      email: adminEmail,
      name: club?.name ?? 'ShiftUp Club',
      metadata: { club_id: clubId, platform: 'clubpulse' },
    });
    customerId = customer.id;

    await admin
      .from('club_subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('club_id', clubId);
  }

  // Get or create the price
  const pricePence =
    billingCycle === 'annual' ? config.annualPence : config.monthlyPence;
  const interval = billingCycle === 'annual' ? 'year' : 'month';

  // Use a product lookup key so we don't create duplicate products
  const lookupKey = `clubpulse_${tier}_${billingCycle}`;

  // Search for existing price
  const existingPrices = await stripe.prices.search({
    query: `lookup_key:"${lookupKey}" active:"true"`,
  });

  let priceId: string;

  if (existingPrices.data.length > 0) {
    priceId = existingPrices.data[0].id;
  } else {
    // Create product + price
    const product = await stripe.products.create({
      name: `ShiftUp ${config.label} (${billingCycle})`,
      metadata: { tier, billing_cycle: billingCycle, platform: 'clubpulse' },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pricePence,
      currency: 'gbp',
      recurring: { interval },
      lookup_key: lookupKey,
      metadata: { tier, billing_cycle: billingCycle },
    });

    priceId = price.id;
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${PLATFORM_URL}/admin/club/settings?subscription=success&tier=${tier}`,
    cancel_url: `${PLATFORM_URL}/admin/club/settings?subscription=canceled`,
    subscription_data: {
      metadata: { club_id: clubId, tier, platform: 'clubpulse' },
      trial_period_days: 30,
    },
    metadata: { club_id: clubId, tier },
    allow_promotion_codes: true,
  });

  return session.url!;
}

/**
 * Create a Stripe Billing Portal session so club admin can manage billing.
 */
export async function createBillingPortal(clubId: string): Promise<string | null> {
  const stripe = getStripe();
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from('club_subscriptions')
    .select('stripe_customer_id')
    .eq('club_id', clubId)
    .maybeSingle();

  if (!sub?.stripe_customer_id) return null;

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${PLATFORM_URL}/admin/club/settings`,
  });

  return session.url;
}
