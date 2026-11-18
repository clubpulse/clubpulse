// POST /api/player/plan/portal → { url } of Stripe's page for changing the card or cancelling

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createPlayerPortal } from '@/lib/billing/player';
import { fail, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  try {
    const res = await createPlayerPortal(user.id);
    if (!res.ok) return fail(res.error, res.status);
    return NextResponse.json({ url: res.url });
  } catch (err) {
    console.error('[player/plan] portal failed:', err);
    return fail('Could not open your plan settings. Please try again.', 502);
  }
}
