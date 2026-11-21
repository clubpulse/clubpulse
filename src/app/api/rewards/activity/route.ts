// POST /api/rewards/activity { kind: 'warmup' }                → a Warm-Up session was finished today
// POST /api/rewards/activity { kind: 'mind_week', week: 1..6 } → a week of Mind Nets was finished
//
// These count towards the daily, weekly and monthly tasks. They are the member's own word, so
// each kind counts once a day at most and the tasks they feed are small. Which Warm-Up session
// was done is never sent or stored.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { logActivity } from '@/lib/mobile/rewards';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const body = (await readJson(req)) as { kind?: unknown; week?: unknown } | null;
  if (body?.kind === 'warmup') {
    await logActivity(user.id, 'warmup');
  } else if (body?.kind === 'mind_week' && Number.isInteger(body.week) && (body.week as number) >= 1 && (body.week as number) <= 6) {
    await logActivity(user.id, 'mind_week', { week: body.week });
  } else {
    return fail('Unknown activity.', 400);
  }
  return NextResponse.json({ ok: true });
}
