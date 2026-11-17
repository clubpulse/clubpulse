/**
 * POST /api/club/stripe/webhook
 *
 * Stripe webhook endpoint. Handles:
 *   - checkout.session.completed
 *   - checkout.session.expired
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - account.updated (Connect)
 *
 * Must be configured in Stripe Dashboard → Webhooks.
 * Raw body required for signature verification.
 */

import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { constructWebhookEvent } from '@/lib/stripe/client';
import {
  handleCheckoutCompleted,
  handleCheckoutExpired,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleAccountUpdated,
} from '@/lib/stripe/webhook-handlers';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = constructWebhookEvent(rawBody, signature);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        // Unhandled event type — acknowledge silently
        break;
    }
  } catch (err) {
    console.error(`[stripe/webhook] handler error for ${event.type}:`, err);
    // Still return 200 to prevent Stripe retries for handler errors
  }

  return NextResponse.json({ received: true });
}
