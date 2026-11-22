// GET  /api/wellness/readiness → today's check-in (or null) and the last four weeks
// POST /api/wellness/readiness { sleep, mood, soreness, stress, notes? } → save today's check-in
// Private to the signed-in person. Coaches see averages only, through the website's consent settings.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { readinessToday, readinessTrendFor, saveReadinessFor } from '@/lib/wellness/service';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const [today, trend] = await Promise.all([readinessToday(user.id), readinessTrendFor(user.id)]);
  if (!today.success) return fail(today.error);
  if (!trend.success) return fail(trend.error);
  return NextResponse.json({ ...today.data, trend: trend.data });
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const r = await saveReadinessFor(user.id, await readJson(req));
  return r.success ? NextResponse.json({ ok: true }) : fail(r.error);
}
