// POST /api/rewards/claim  { id }  → pays a reward whose goals the server can see are done

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { claimReward } from '@/lib/mobile/rewards';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const id = ((await readJson(req)) as { id?: unknown } | null)?.id;
  if (typeof id !== 'string' || id.length > 40) return fail('Send the id of the reward to claim.', 400);

  const claimed = await claimReward(user.id, id);
  if (!claimed.ok) return fail(claimed.error, claimed.status);
  return NextResponse.json({ amount: claimed.amount, capped: claimed.capped });
}
