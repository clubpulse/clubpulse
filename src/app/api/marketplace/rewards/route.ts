// GET /api/marketplace/rewards → { rewards }

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { listActiveRewards } from '@/lib/marketplace/service';
import { fail, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { supabase, user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const result = await listActiveRewards(supabase);
  if (!result.success) return fail(result.error, 500);
  return NextResponse.json({ rewards: result.data });
}
