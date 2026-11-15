/**
 * POST /api/club/subscription/portal
 *
 * Creates a Stripe Billing Portal session.
 * Body: { club_id }
 * Returns: { portal_url }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createBillingPortal } from '@/lib/stripe/subscriptions';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { club_id?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const clubId = body.club_id;
  if (!clubId) return NextResponse.json({ error: 'Missing club_id' }, { status: 400 });

  // Check admin
  const { data: role } = await createAdminClient()
    .from('club_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle();

  if (!role || (role.role !== 'club_admin' && role.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const portalUrl = await createBillingPortal(clubId);
    if (!portalUrl) {
      return NextResponse.json(
        { error: 'No subscription found — subscribe first' },
        { status: 404 },
      );
    }

    return NextResponse.json({ portal_url: portalUrl });
  } catch (err) {
    console.error('[subscription/portal] error:', err);
    return NextResponse.json(
      { error: 'Could not create billing portal' },
      { status: 500 },
    );
  }
}
