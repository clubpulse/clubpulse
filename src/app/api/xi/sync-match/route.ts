/**
 * POST /api/xi/sync-match
 *
 * Fires when a ClubPulse scorecard is closed for a specific player.
 * Sends their performance to The XI and writes the resulting fantasy + rewards
 * points back to Supabase, then returns the breakdown to the caller.
 *
 * Body:
 *   match_id       — ClubPulse match/fixture UUID
 *   match_date     — ISO date string
 *   opposition     — opponent club name (optional)
 *   batting        — batting stats (optional)
 *   bowling        — bowling stats (optional)
 *   fielding       — fielding stats (optional)
 *   player_of_match — boolean (optional)
 *
 * Security: authenticated route — XI_API_KEY never leaves the server.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createClient } from '@/lib/supabase/server';
import { fail, unauthorized } from '@/lib/utils/http';
import { xiSyncPerformance, type XiPerformanceInput } from '@/lib/xi/client';

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: Omit<XiPerformanceInput, 'xi_user_id' | 'clubpulse_match_id'> & {
    match_id: string;
  };

  try {
    body = await req.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }

  if (!body.match_id) return fail('match_id is required', 400);
  if (!body.match_date) return fail('match_date is required', 400);
  if (!body.batting && !body.bowling && !body.fielding) {
    return fail('At least one of batting, bowling or fielding is required', 400);
  }

  // ── Look up xi_user_id from profile ───────────────────────────────────────
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('xi_user_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return fail('Profile not found', 404);
  }

  if (!profile.xi_user_id) {
    // XI account not provisioned yet — not a hard failure
    return NextResponse.json({
      synced: false,
      reason: 'XI account not linked — sign out and back in to link',
    }, { status: 202 });
  }

  // ── Send to The XI ────────────────────────────────────────────────────────
  const xiResult = await xiSyncPerformance({
    xi_user_id: profile.xi_user_id,
    clubpulse_match_id: body.match_id,
    match_date: body.match_date,
    opposition: body.opposition,
    batting: body.batting,
    bowling: body.bowling,
    fielding: body.fielding,
    player_of_match: body.player_of_match,
  });

  if (!xiResult) {
    // The XI was unreachable — log but don't fail the scorecard flow
    return NextResponse.json({
      synced: false,
      reason: 'The XI sync failed — will retry on next match',
    }, { status: 202 });
  }

  // ── Write XI results back to ClubPulse ────────────────────────────────────
  // Store fantasy points and XI rewards on the match performance record
  const { error: updateError } = await supabase
    .from('match_performances')
    .upsert({
      user_id: user.id,
      match_id: body.match_id,
      xi_fantasy_points: xiResult.fantasy_points,
      xi_rewards_points: xiResult.rewards_points,
      xi_tier_multiplier: xiResult.tier_multiplier,
      xi_synced_at: new Date().toISOString(),
    }, { onConflict: 'user_id,match_id' });

  if (updateError) {
    console.error('[xi/sync-match] failed to write XI results to Supabase', updateError);
    // Still return success — the data came back from XI, Supabase write is best-effort
  }

  // Also record the rewards earned as a wallet transaction on ClubPulse
  // so the player sees it in their ClubPulse wallet history too
  if (xiResult.rewards_points > 0) {
    await supabase.from('wallet_transactions').insert({
      user_id: user.id,
      amount: xiResult.rewards_points,
      title: body.opposition
        ? `Match vs ${body.opposition} — XI Rewards`
        : 'Match performance — XI Rewards',
      category: 'xi_rewards',
      occurred_at: body.match_date,
    });

    await supabase.rpc('increment_wallet_flexi', {
      p_user_id: user.id,
      p_amount: xiResult.rewards_points,
    });
  }

  return NextResponse.json({
    synced: true,
    fantasy_points: xiResult.fantasy_points,
    rewards_points: xiResult.rewards_points,
    new_wallet_balance: xiResult.new_wallet_balance,
    tier_multiplier: xiResult.tier_multiplier,
    breakdown: xiResult.breakdown,
  });
}
