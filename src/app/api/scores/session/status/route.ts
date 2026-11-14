/**
 * GET /api/scores/session/status?session_id=<uuid>
 *
 * Polled by the player's QR screen every 2 seconds to check if the
 * merchant has completed the payment.
 */

import { NextRequest, NextResponse }  from 'next/server';
import { createAdminClient }          from '@/lib/supabase/admin';
import { getRequestAuth }             from '@/lib/supabase/request-auth';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const session_id = req.nextUrl.searchParams.get('session_id');
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin
    .from('scores_pay_sessions')
    .select('is_used, expires_at, scores_amount')
    .eq('id', session_id)
    .eq('player_id', user.id)   // Players can only poll their own sessions
    .maybeSingle();

  if (!data) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  return NextResponse.json({
    is_used:       data.is_used,
    scores_amount: data.scores_amount,
    expires_at:    data.expires_at,
  });
}
