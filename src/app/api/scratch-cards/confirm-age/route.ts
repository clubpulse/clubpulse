// POST /api/scratch-cards/confirm-age → records that the member says they are 18 or over.
// A junior account stays locked whatever is sent here: the club's junior flag is checked at reveal.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { confirmAdultForUser } from '@/lib/scratch/service';
import { fail, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const res = await confirmAdultForUser(user.id);
  if (!res.success) return fail(res.error, 500);
  return NextResponse.json({ ok: true });
}
