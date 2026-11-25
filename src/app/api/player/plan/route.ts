// GET  /api/player/plan            → what this player can buy and what they have
// POST /api/player/plan  { plan }  → { url } of the Stripe page to pay on

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createMemberCheckout, createPlayerCheckout, getPlayerPlan } from '@/lib/billing/player';
import { clubMemberPricingEnabled } from '@/lib/billing/member-pricing';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getPlayerPlan(user.id));
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const body = (await readJson(req)) as { plan?: unknown; forUserId?: unknown } | null;
  const plan = body?.plan;
  const forUserId = typeof body?.forUserId === 'string' ? body.forUserId : null;
  try {
    const res = clubMemberPricingEnabled() && forUserId
      ? await createMemberCheckout(forUserId, user.email ?? null, plan, user.id)
      : await createPlayerCheckout(user.id, user.email ?? null, plan);
    if (!res.ok) return fail(res.error, res.status);
    return NextResponse.json({ url: res.url });
  } catch (err) {
    console.error('[player/plan] checkout failed:', err);
    return fail('Could not start the payment. Nothing has been charged.', 502);
  }
}
