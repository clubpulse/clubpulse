import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/**
 * Singleton Stripe client. Server-only — never import from Client Components.
 *
 * Requires STRIPE_SECRET_KEY in env.
 * Uses API version 2024-12-18.acacia (latest stable at build time).
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Missing STRIPE_SECRET_KEY');

  _stripe = new Stripe(key, {
    apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    typescript: true,
    appInfo: {
      name: 'ShiftUp',
      version: '1.0.0',
      url: 'https://shiftup.club',
    },
  });

  return _stripe;
}

/** Flat application fee percentage on all destination charges. */
export const APPLICATION_FEE_PCT = 0.05;

/** Construct a webhook event from raw body + signature header. */
export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}
