/**
 * Scores Pack purchasing via Stripe Checkout (destination charges).
 *
 * Flow:
 *   1. Club admin picks a pack → createScoresPackCheckout()
 *   2. Stripe Checkout opens → club pays
 *   3. Webhook fires checkout.session.completed → mark purchase as succeeded
 *   4. credit_scores_pack RPC credits Scores to club pool
 *
 * Destination charges:
 *   - Total goes to the platform account
 *   - 5% application_fee is retained by ClubPulse
 *   - Net (95%) is transferred to the club's connected Stripe account
 *
 * But wait — the club is BUYING Scores from the platform, so the money
 * stays with ClubPulse. No transfer to the club's Connect account.
 * The Connect account is for when the club's own customers pay the club.
 */

import { getStripe } from './client';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ScoresPack } from '@/lib/types/subscription';

const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clubpulse.co';

/**
 * Create a Stripe Checkout session for purchasing a Scores pack.
 * Payment goes entirely to the platform (ClubPulse).
 */
export async function createScoresPackCheckout(
  clubId: string,
  packId: string,
  adminUserId: string,
  adminEmail: string,
): Promise<{ checkoutUrl: string; purchaseId: string }> {
  const stripe = getStripe();
  const admin = createAdminClient();

  // Fetch the pack
  const { data: pack } = await admin
    .from('scores_packs')
    .select('*')
    .eq('id', packId)
    .eq('is_active', true)
    .maybeSingle();

  if (!pack) throw new Error('Pack not found or inactive');
  const scoresPack = pack as ScoresPack;

  // Get club name for the description
  const { data: club } = await admin
    .from('clubs')
    .select('name')
    .eq('id', clubId)
    .maybeSingle();

  // Create the purchase record (pending)
  const { data: purchase, error: insertErr } = await admin
    .from('scores_pack_purchases')
    .insert({
      club_id: clubId,
      pack_id: packId,
      purchased_by: adminUserId,
      scores_amount: scoresPack.scores_amount,
      price_pence: scoresPack.price_pence,
      payment_status: 'pending',
    })
    .select('id')
    .single();

  if (insertErr || !purchase) throw new Error('Could not create purchase record');

  // Create Checkout session — payment to platform account (no destination)
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          unit_amount: scoresPack.price_pence,
          product_data: {
            name: scoresPack.name,
            description: `${scoresPack.scores_amount.toLocaleString()} Scores for ${club?.name ?? 'your club'}`,
            metadata: { pack_id: packId, platform: 'clubpulse' },
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${PLATFORM_URL}/admin/club/scores-packs?purchase=success&amount=${scoresPack.scores_amount}`,
    cancel_url: `${PLATFORM_URL}/admin/club/scores-packs?purchase=canceled`,
    metadata: {
      type: 'scores_pack_purchase',
      club_id: clubId,
      pack_id: packId,
      purchase_id: purchase.id,
      scores_amount: String(scoresPack.scores_amount),
    },
    customer_email: adminEmail,
  });

  // Store checkout ID on the purchase
  await admin
    .from('scores_pack_purchases')
    .update({ stripe_checkout_id: session.id })
    .eq('id', purchase.id);

  return { checkoutUrl: session.url!, purchaseId: purchase.id };
}

/**
 * List available Scores packs for purchase.
 */
export async function listScoresPacks(): Promise<ScoresPack[]> {
  const { data } = await createAdminClient()
    .from('scores_packs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  return (data ?? []) as ScoresPack[];
}

/**
 * Get a club's Scores pack purchase history.
 */
export async function getClubPurchaseHistory(clubId: string) {
  const { data } = await createAdminClient()
    .from('scores_pack_purchases')
    .select('*, scores_packs(name)')
    .eq('club_id', clubId)
    .eq('payment_status', 'succeeded')
    .order('created_at', { ascending: false })
    .limit(50);

  return data ?? [];
}
