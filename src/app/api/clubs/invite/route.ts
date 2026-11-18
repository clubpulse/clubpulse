// GET  /api/clubs/invite → { clubName, code }   the club's join code (club admins only)
// POST /api/clubs/invite → { clubName, code }   replace the code, so the old one stops working

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getInvite, replaceInviteCode } from '@/lib/mobile/club-admin';
import { fail, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const result = await getInvite(user.id);
  if (!result.success) return fail(result.error, 403);
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const result = await replaceInviteCode(user.id);
  if (!result.success) return fail(result.error, 403);
  return NextResponse.json(result.data);
}
