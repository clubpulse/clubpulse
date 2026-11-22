/**
 * POST /api/club/subscription
 *
 * Create a Stripe Checkout session for a subscription upgrade.
 * Body: { club_id, tier, billing_cycle }
 * Returns: { checkout_url }
 *
 * GET /api/club/subscription?club_id=<uuid>
 * Returns the club's current subscription status.
 *
 * POST /api/club/subscription/portal
 * Body: { club_id }
 * Returns: { portal_url }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import {
  createSubscriptionCheckout,
  createBillingPortal,
} from '@/lib/stripe/subscriptions';
import type { SubscriptionTier } from '@/lib/types/subscription';

const VALID_TIERS: SubscriptionTier[] = ['starter', 'pro', 'elite'];

async function assertClubAdmin(userId: string, clubId: string) {
  const { data } = await createAdminClient()
    .from('club_members')
    .select('role')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle();
  return data?.role === 'club_admin';
}

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clubId = req.nextUrl.searchParams.get('club_id');
  if (!clubId) return NextResponse.json({ error: 'Missing club_id' }, { status: 400 });
  if (!(await assertClubAdmin(user.id, clubId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: sub } = await createAdminClient()
    .from('club_subscriptions')
    .select('*')
    .eq('club_id', clubId)
    .maybeSingle();

  if (!sub) {
    return NextResponse.json({
      tier: 'free',
      status: 'trialing',
      max_members: 25,
      max_scores_per_month: 5000,
    });
  }

  return NextResponse.json(sub);
}

// Card checkout for clubs is switched off: a club agrees its plan and period with us first.
// Set CLUB_SELF_CHECKOUT=on to bring it back. The code below is kept for that.
const SELF_CHECKOUT = process.env.CLUB_SELF_CHECKOUT === 'on';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!SELF_CHECKOUT) return NextResponse.json({ error: 'Club plans and Scores are arranged directly with ShiftUp. Tell us what your club needs at shiftup.club/contact.' }, { status: 403 });

  let body: { club_id?: string; tier?: string; billing_cycle?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const clubId = body.club_id;
  const tier = body.tier as SubscriptionTier | undefined;
  const billingCycle = (body.billing_cycle ?? 'monthly') as 'monthly' | 'annual';

  if (!clubId || !tier) {
    return NextResponse.json({ error: 'Missing club_id or tier' }, { status: 400 });
  }

  if (!VALID_TIERS.includes(tier)) {
    return NextResponse.json(
      { error: `Tier must be one of: ${VALID_TIERS.join(', ')}` },
      { status: 400 },
    );
  }

  if (billingCycle !== 'monthly' && billingCycle !== 'annual') {
    return NextResponse.json(
      { error: 'billing_cycle must be monthly or annual' },
      { status: 400 },
    );
  }

  if (!(await assertClubAdmin(user.id, clubId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const checkoutUrl = await createSubscriptionCheckout(
      clubId,
      tier,
      billingCycle,
      user.email ?? '',
    );

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (err) {
    console.error('[subscription] checkout error:', err);
    return NextResponse.json(
      { error: 'Could not create checkout session' },
      { status: 500 },
    );
  }
}
