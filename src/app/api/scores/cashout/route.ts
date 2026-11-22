/**
 * POST /api/scores/cashout
 *
 * Club admin requests conversion of their accumulated Scores to GBP.
 * Phase 1: queues the request for manual processing (3 business days).
 * Phase 2: will trigger BaaS (Modulr/Railsbank) payout automatically.
 *
 * Body: { club_id, scores_amount }
 * Response: { ok, scores_queued, gbp_pence, note }
 *
 * GET /api/scores/cashout?club_id=<uuid>
 * Returns the club's current merchant wallet balance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase/admin';
import { getRequestAuth }            from '@/lib/supabase/request-auth';
import { isClubAdmin }               from '@/lib/auth/admin';
import { cashoutPence, MIN_CASHOUT_SCORES } from '@/lib/types/scores';

async function assertClubAdmin(_adminClient: ReturnType<typeof createAdminClient>, userId: string, clubId: string) {
  return isClubAdmin(userId, clubId);
}

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const club_id = req.nextUrl.searchParams.get('club_id');
  if (!club_id) return NextResponse.json({ error: 'Missing club_id' }, { status: 400 });

  const admin = createAdminClient();
  if (!(await assertClubAdmin(admin, user.id, club_id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: wallet } = await admin
    .from('merchant_wallets')
    .select('scores_balance, lifetime_received, pending_cashout')
    .eq('club_id', club_id)
    .maybeSingle();

  return NextResponse.json({
    scores_balance:    wallet?.scores_balance    ?? 0,
    lifetime_received: wallet?.lifetime_received ?? 0,
    pending_cashout:   wallet?.pending_cashout   ?? 0,
    // GBP equivalent at the cashout rate (face value less the ShiftUp margin)
    available_gbp_pence: cashoutPence(wallet?.scores_balance ?? 0),
  });
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { club_id?: unknown; scores_amount?: unknown };
  try { body = await req.json(); } catch { body = {}; }

  const club_id      = body.club_id      as string | undefined;
  const scores_amount = Number(body.scores_amount);

  if (!club_id || !scores_amount || scores_amount < MIN_CASHOUT_SCORES) {
    return NextResponse.json(
      { error: 'Missing club_id or scores_amount (minimum ' + MIN_CASHOUT_SCORES + ' Scores)' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!(await assertClubAdmin(admin, user.id, club_id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await admin.rpc('request_scores_cashout', {
    p_club_id:       club_id,
    p_scores_amount: scores_amount,
  });

  if (error) {
    console.error('[scores/cashout] rpc error:', error);
    return NextResponse.json({ error: 'Cashout request failed' }, { status: 500 });
  }

  if (!data?.ok) {
    return NextResponse.json(data, { status: 422 });
  }

  return NextResponse.json(data);
}
