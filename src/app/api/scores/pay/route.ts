/**
 * POST /api/scores/pay
 *
 * Merchant (club admin) scans the player's QR code and triggers the payment.
 * Calls process_scores_payment RPC which atomically transfers Scores.
 *
 * Body: { session_id, club_id, description? }
 * Response: { ok, payment_id, scores_spent, fee_scores, net_to_merchant, payer_balance_after }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase/admin';
import { getRequestAuth }            from '@/lib/supabase/request-auth';

export async function POST(req: NextRequest) {
  // Must be a signed-in club admin
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { session_id?: unknown; club_id?: unknown; description?: unknown };
  try { body = await req.json(); } catch { body = {}; }

  const session_id  = body.session_id  as string | undefined;
  const club_id     = body.club_id     as string | undefined;
  const description = body.description as string | undefined;

  if (!session_id || !club_id) {
    return NextResponse.json({ error: 'Missing session_id or club_id' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify caller is an admin of this club
  const { data: role } = await admin
    .from('club_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('club_id', club_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!role || role.role !== 'admin') {
    return NextResponse.json({ error: 'Must be a club admin to accept payments' }, { status: 403 });
  }

  // Fire the atomic RPC
  const { data, error } = await admin.rpc('process_scores_payment', {
    p_session_id:  session_id,
    p_club_id:     club_id,
    p_description: description ?? null,
  });

  if (error) {
    console.error('[scores/pay] rpc error:', error);
    return NextResponse.json({ error: 'Payment processing failed' }, { status: 500 });
  }

  if (!data?.ok) {
    // RPC returned a business logic error (insufficient balance, expired session etc.)
    return NextResponse.json(data, { status: 422 });
  }

  return NextResponse.json(data);
}
