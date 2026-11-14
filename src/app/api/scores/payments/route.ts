/**
 * GET /api/scores/payments?club_id=<uuid>
 *
 * Returns the 20 most recent Scores payments received by this club.
 * Only accessible to club admins.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase/admin';
import { getRequestAuth }            from '@/lib/supabase/request-auth';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const club_id = req.nextUrl.searchParams.get('club_id');
  if (!club_id) return NextResponse.json({ error: 'Missing club_id' }, { status: 400 });

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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await admin
    .from('scores_payments')
    .select('id, payer_id, scores_amount, net_scores, fee_scores, description, created_at')
    .eq('club_id', club_id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[scores/payments] query error:', error);
    return NextResponse.json({ error: 'Failed to load payments' }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
