// POST /api/marketplace/redeem  { rewardId }  → { redemptionId, credsSpent, balance }
// Deduct + stock + redemption row happen atomically in the redeem_reward SQL function.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { redeemRewardForUser } from '@/lib/marketplace/service';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const body = (await readJson(req)) as { rewardId?: unknown } | null;
  if (typeof body?.rewardId !== 'string') return fail('rewardId is required', 400);

  const result = await redeemRewardForUser(user.id, body.rewardId);
  if (!result.success) {
    // 402 for "can't afford" so clients can tell it apart from a bad request
    return fail(result.error, /not enough creds/i.test(result.error) ? 402 : undefined);
  }
  return NextResponse.json(result.data);
}
