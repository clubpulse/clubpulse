// GET /api/academy → tracks, lessons, the caller's progress and level, and their current plan

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getAcademy } from '@/lib/academy/service';
import { unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getAcademy(user.id));
}
