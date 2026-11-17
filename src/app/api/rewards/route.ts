// GET /api/rewards → the caller's daily, weekly and monthly goals, and which rewards are ready

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getRewards } from '@/lib/mobile/rewards';
import { unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getRewards(user.id));
}
