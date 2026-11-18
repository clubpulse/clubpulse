// GET  /api/player/plan            → what this player can buy and what they have
// POST /api/player/plan  { plan }  → { url } of the Stripe page to pay on

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createPlayerCheckout, getPlayerPlan } from '@/lib/billing/player';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getPlayerPlan(user.id));
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const plan = ((await readJson(req)) as { plan?: unknown } | null)?.plan;
  try {
    const res = await createPlayerCheckout(user.id, user.email ?? null, plan);
    if (!res.ok) return fail(res.error, res.status);
    return NextResponse.json({ url: res.url });
  } catch (err) {
    console.error('[player/plan] checkout failed:', err);
    return fail('Could not start the payment. Nothing has been charged.', 502);
  }
}
