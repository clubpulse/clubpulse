/**
 * GET /api/club/scores-packs
 * Returns all available Scores packs.
 *
 * POST /api/club/scores-packs
 * Body: { club_id, pack_id }
 * Creates a Stripe Checkout session for purchasing a Scores pack.
 * Returns: { checkout_url, purchase_id }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import {
  listScoresPacks,
  createScoresPackCheckout,
} from '@/lib/stripe/scores-packs';

export async function GET() {
  const packs = await listScoresPacks();
  return NextResponse.json({ packs });
}

// Buying Scores by card is switched off: Scores are arranged as part of a club's agreement.
// Set CLUB_SELF_CHECKOUT=on to bring it back. The code below is kept for that.
const SELF_CHECKOUT = process.env.CLUB_SELF_CHECKOUT === 'on';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!SELF_CHECKOUT) return NextResponse.json({ error: 'Club plans and Scores are arranged directly with ClubPulse. Tell us what your club needs at clubpulse.co/contact.' }, { status: 403 });

  let body: { club_id?: string; pack_id?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const clubId = body.club_id;
  const packId = body.pack_id;

  if (!clubId || !packId) {
    return NextResponse.json({ error: 'Missing club_id or pack_id' }, { status: 400 });
  }

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
    const { checkoutUrl, purchaseId } = await createScoresPackCheckout(
      clubId,
      packId,
      user.id,
      user.email ?? '',
    );

    return NextResponse.json({ checkout_url: checkoutUrl, purchase_id: purchaseId });
  } catch (err) {
    console.error('[scores-packs] checkout error:', err);
    return NextResponse.json(
      { error: 'Could not create checkout session' },
      { status: 500 },
    );
  }
}
