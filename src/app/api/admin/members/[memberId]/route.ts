// GET   /api/admin/members/:memberId → { member }
// PATCH /api/admin/members/:memberId  { role?, is_active? } → { member }
// Club admins only (admin of the member's club).

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getClubMember, updateClubMember } from '@/lib/admin/service';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

type Context = { params: Promise<{ memberId: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const { memberId } = await params;
  const result = await getClubMember(user.id, memberId);
  if (!result.success) return fail(result.error);
  return NextResponse.json({ member: result.data });
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const { memberId } = await params;
  const result = await updateClubMember(user.id, memberId, await readJson(req));
  if (!result.success) return fail(result.error);
  return NextResponse.json({ member: result.data });
}
