// POST /api/admin/shifts → { id }   post a volunteer shift at the caller's club (club admins only)
// Body: { title, role, shift_date (YYYY-MM-DD), start_time (HH:MM), end_time, location?, description?, max_volunteers? }

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { postShift } from '@/lib/mobile/club-admin';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const result = await postShift(user.id, await readJson(req));
  if (!result.success) return fail(result.error, /only club admins/i.test(result.error) ? 403 : 400);
  return NextResponse.json(result.data);
}
