// GET /api/shifts?tab=available|my → upcoming volunteer shifts at the caller's clubs

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { listMemberShifts } from '@/lib/mobile/club-data';
import { unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const tab = req.nextUrl.searchParams.get('tab') === 'my' ? 'my' : 'available';
  return NextResponse.json(await listMemberShifts(user.id, tab));
}
