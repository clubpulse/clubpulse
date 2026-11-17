// GET /api/coaches → approved, visible coaches at the caller's clubs (mobile Coaches tab)

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { listClubCoaches } from '@/lib/mobile/club-data';
import { unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  return NextResponse.json(await listClubCoaches(user.id));
}
