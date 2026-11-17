// GET /api/coaches/:id → one coach at the caller's club, with weekly availability

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getClubCoach, isUuid } from '@/lib/mobile/club-data';
import { fail, unauthorized } from '@/lib/utils/http';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const { id } = await params;
  const coach = isUuid(id) ? await getClubCoach(user.id, id) : null;
  if (!coach) return fail('Coach not found', 404);
  return NextResponse.json(coach);
}
