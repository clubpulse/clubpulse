/**
 * POST /api/scores/session
 *
 * Player creates a QR payment session before showing the QR code.
 * Returns a session ID which is encoded into the QR.
 *
 * Body: { scores_amount: number }
 * Response: { session_id, scores_amount, expires_at, qr_payload }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase/admin';
import { getRequestAuth }            from '@/lib/supabase/request-auth';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { scores_amount?: unknown };
  try { body = await req.json(); } catch { body = {}; }

  const scores_amount = Number(body.scores_amount);
  if (!scores_amount || scores_amount < 1 || !Number.isInteger(scores_amount)) {
    return NextResponse.json({ error: 'scores_amount must be a positive integer' }, { status: 400 });
  }

  // Check player has sufficient balance before creating session
  const admin = createAdminClient();
  const { data: wallet } = await admin
    .from('creds_wallet')
    .select('flexi_balance')
    .eq('user_id', user.id)
    .single();

  if (!wallet || wallet.flexi_balance < scores_amount) {
    return NextResponse.json(
      { error: 'insufficient_balance', balance: wallet?.flexi_balance ?? 0 },
      { status: 422 },
    );
  }

  // Create session (expires in 5 minutes — set by DB default)
  const { data: session, error } = await admin
    .from('scores_pay_sessions')
    .insert({ player_id: user.id, scores_amount })
    .select('id, scores_amount, expires_at')
    .single();

  if (error || !session) {
    console.error('[scores/session] insert error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  // QR payload — merchant's app decodes this and calls /api/scores/pay
  const qr_payload = JSON.stringify({
    type:          'shiftup_scores_payment',
    session_id:    session.id,
    scores_amount: session.scores_amount,
  });

  return NextResponse.json({
    session_id:    session.id,
    scores_amount: session.scores_amount,
    expires_at:    session.expires_at,
    qr_payload,
  }, { status: 201 });
}
