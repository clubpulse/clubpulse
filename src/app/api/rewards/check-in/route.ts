// POST /api/rewards/check-in → today's check-in (the existing seven-day ladder)

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { checkInToday } from '@/lib/mobile/rewards';
import { fail, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const done = await checkInToday(user.id);
  if (!done.ok) return fail(done.error, done.status);
  return NextResponse.json({ day: done.day, amount: done.amount, gotCard: done.gotCard, capped: done.capped });
}
