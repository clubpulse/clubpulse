// GET /api/safeguarding → { dbs } for the mobile Safeguarding screen.
// Club admins get their club's DBS checks; everyone else gets only their own.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { listDbsForUser } from '@/lib/mobile/club-data';
import { unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  return NextResponse.json({ dbs: await listDbsForUser(user.id) });
}
