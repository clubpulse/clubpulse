// POST /api/shifts/cancel  Body: { shiftId }

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { cancelShiftSignup, isUuid } from '@/lib/mobile/club-data';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const body = (await readJson(req)) as { shiftId?: unknown } | null;
  if (!isUuid(body?.shiftId)) return fail('shiftId required', 400);

  const result = await cancelShiftSignup(user.id, body.shiftId);
  if (!result.success) return fail(result.error, 400);
  return NextResponse.json({ ok: true });
}
