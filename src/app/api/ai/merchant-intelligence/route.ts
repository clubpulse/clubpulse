// GET /api/ai/merchant-intelligence → RedemptionInsight (anonymised aggregates + a summary)
// Access: the service role key as a Bearer token (platform-wide), or a signed-in user with the
// merchant role (scoped to their own rewards). Everyone else gets 403.

import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { isMerchant } from '@/lib/auth/admin';
import { getMerchantInsights } from '@/lib/ai/merchant-intelligence';
import { fail, unauthorized } from '@/lib/utils/http';

function isServiceRole(req: NextRequest): boolean {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!key || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  try {
    if (isServiceRole(req)) return NextResponse.json(await getMerchantInsights());

    const { user } = await getRequestAuth(req);
    if (!user) return unauthorized();
    if (!(await isMerchant(user.id))) return fail('Forbidden', 403);

    return NextResponse.json(await getMerchantInsights(user.id));
  } catch {
    return fail('Could not build insights', 500);
  }
}
