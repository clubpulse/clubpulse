/**
 * GET /api/club/scores-packs/history?club_id=<uuid>
 * Returns a club's Scores pack purchase history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getClubPurchaseHistory } from '@/lib/stripe/scores-packs';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clubId = req.nextUrl.searchParams.get('club_id');
  if (!clubId) return NextResponse.json({ error: 'Missing club_id' }, { status: 400 });

  // Check admin
  const { data: role } = await createAdminClient()
    .from('club_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle();

  if (!role || role.role !== 'club_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const purchases = await getClubPurchaseHistory(clubId);
  return NextResponse.json({ purchases });
}
