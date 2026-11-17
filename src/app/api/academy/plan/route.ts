// POST /api/academy/plan  { focus, role, sessions, minutes } → a one-week practice plan
// Written by Coach AI from the lesson library; falls back to a library-only plan if the AI is unavailable.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createPlan } from '@/lib/academy/service';
import { parsePlanRequest } from '@/lib/academy/logic';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const request = parsePlanRequest(await readJson(req));
  if (typeof request === 'string') return fail(request, 400);

  const created = await createPlan(user.id, request);
  if (!created.ok) return fail(created.error, created.status);
  return NextResponse.json({ plan: created.plan, plansLeftThisWeek: created.plansLeftThisWeek });
}
