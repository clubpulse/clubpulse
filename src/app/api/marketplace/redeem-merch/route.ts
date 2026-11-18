// POST /api/marketplace/redeem-merch  { rewardId, delivery: { size?, name, line1, line2?, town, postcode } }
//   → { redemptionId, scoresSpent, balance }
// Scores are taken and the delivery address saved in one database transaction (redeem_merch).

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { redeemMerchForUser } from '@/lib/merch/service';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const body = (await readJson(req)) as { rewardId?: unknown; delivery?: unknown } | null;
  if (typeof body?.rewardId !== 'string') return fail('rewardId is required', 400);

  const result = await redeemMerchForUser(user.id, body.rewardId, body.delivery);
  if (!result.success) {
    return fail(result.error, /not enough scores/i.test(result.error) ? 402 : undefined);
  }
  return NextResponse.json(result.data);
}
