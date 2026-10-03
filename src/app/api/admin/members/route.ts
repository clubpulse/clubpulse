// GET /api/admin/members?clubId=<uuid> → { members }   (club admins only)

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { listClubMembers } from '@/lib/admin/service';
import { fail, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const result = await listClubMembers(user.id, req.nextUrl.searchParams.get('clubId') ?? '');
  if (!result.success) return fail(result.error);
  return NextResponse.json({ members: result.data });
}
