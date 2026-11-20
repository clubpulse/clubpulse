// GET /api/role-page?role=player|coach|parent|admin → what that role's page shows for the caller
// GET /api/role-page                                 → just the role pages the caller has

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getRolePageForUser, isMobileRole } from '@/lib/mobile/role-pages';
import { fail, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const role = req.nextUrl.searchParams.get('role') ?? 'player';
  if (!isMobileRole(role)) return fail('Unknown role.', 400);
  return NextResponse.json(await getRolePageForUser(user.id, role));
}
