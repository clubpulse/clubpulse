/**
 * POST /api/scores/redeem-gift-card
 *
 * Player redeems Scores for a gift card via Tango Card RaaS.
 *
 * Flow:
 *   1. Auth check
 *   2. Look up the reward in rewards_catalogue (must have tango_utid set)
 *   3. Call redeem_reward RPC — atomically deducts Scores, records redemption
 *   4. Place Tango order (server-side only — key never reaches browser)
 *   5. Store voucher token on the redemption row
 *   6. Return voucher details to the player
 *
 * Body: { reward_id: string }
 *
 * Response: {
 *   ok: true,
 *   redemption_id: string,
 *   scores_spent: number,
 *   balance_after: number,
 *   voucher: { token: string, redemption_instructions: string, expiry?: string }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { SCORES_PER_GBP } from '@/lib/types/scores';
import { createAdminClient }         from '@/lib/supabase/admin';
import { getRequestAuth }            from '@/lib/supabase/request-auth';
import { placeTangoOrder }           from '@/lib/tango/client';

export async function POST(req: NextRequest) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { reward_id?: unknown };
  try { body = await req.json(); } catch { body = {}; }

  const reward_id = body.reward_id as string | undefined;
  if (!reward_id) return NextResponse.json({ error: 'Missing reward_id' }, { status: 400 });

  const admin = createAdminClient();

  // ── 2. Fetch reward — must be a Tango gift card ────────────────────────────
  const { data: reward, error: rewardErr } = await admin
    .from('rewards_catalogue')
    .select('id, title, creds_cost, tango_utid, tango_amount_gbp')
    .eq('id', reward_id)
    .eq('is_active', true)
    .maybeSingle();

  if (rewardErr || !reward) {
    return NextResponse.json({ error: 'Reward not found' }, { status: 404 });
  }

  if (!reward.tango_utid) {
    return NextResponse.json({ error: 'This reward is not a gift card' }, { status: 400 });
  }

  // ── 3. Atomic Scores deduction via RPC ────────────────────────────────────
  const { data: rpc, error: rpcErr } = await admin.rpc('redeem_reward', {
    p_user_id:   user.id,
    p_reward_id: reward_id,
  });

  if (rpcErr) {
    console.error('[redeem-gift-card] RPC error:', rpcErr);
    return NextResponse.json({ error: 'Redemption failed' }, { status: 500 });
  }

  if (!rpc?.ok) {
    const msg =
      rpc?.error === 'insufficient_creds' ? `Not enough Scores (need ${rpc.cost}, have ${rpc.balance})`
      : rpc?.error === 'out_of_stock'      ? 'This reward is out of stock'
      : 'Reward not found';
    return NextResponse.json({ error: msg }, { status: rpc?.error === 'insufficient_creds' ? 402 : 422 });
  }

  const redemptionId: string = rpc.redemption_id;

  // ── 4. Fetch player email (needed for Tango order) ─────────────────────────
  const { data: userData } = await admin.auth.admin.getUserById(user.id);
  const email = userData?.user?.email ?? 'player@clubpulse.app';

  // ── 5. Place Tango order ───────────────────────────────────────────────────
  const amountGBP = reward.tango_amount_gbp ?? reward.creds_cost / SCORES_PER_GBP; // fallback: app-wide rate
  const tangoResult = await placeTangoOrder(
    reward.tango_utid,
    amountGBP,
    email,
    redemptionId, // our ID as external ref for idempotency
  );

  if (!tangoResult.ok) {
    // Tango failed — log it but don't re-deduct. Mark the redemption as pending.
    console.error('[redeem-gift-card] Tango order failed:', tangoResult.error);
    await admin
      .from('reward_redemptions')
      .update({ status: 'tango_pending', notes: tangoResult.error })
      .eq('id', redemptionId);

    return NextResponse.json({
      error: 'Gift card could not be issued right now. Your Scores have been held — we will retry and email you within 24 hours.',
    }, { status: 503 });
  }

  // ── 6. Store voucher on redemption row ─────────────────────────────────────
  await admin
    .from('reward_redemptions')
    .update({
      status:               'fulfilled',
      tango_reference:      tangoResult.referenceOrderID,
      voucher_token:        tangoResult.reward?.token ?? null,
      voucher_instructions: tangoResult.reward?.redemptionInstructions ?? null,
      voucher_expiry:       tangoResult.reward?.expirationDate ?? null,
    })
    .eq('id', redemptionId);

  // ── 7. Respond ─────────────────────────────────────────────────────────────
  return NextResponse.json({
    ok:            true,
    redemption_id: redemptionId,
    scores_spent:  rpc.creds_spent,
    balance_after: rpc.balance,
    voucher: {
      token:                    tangoResult.reward?.token,
      redemption_instructions:  tangoResult.reward?.redemptionInstructions,
      expiry:                   tangoResult.reward?.expirationDate,
    },
  });
}
