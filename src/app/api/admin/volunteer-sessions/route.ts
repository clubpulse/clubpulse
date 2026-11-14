// GET /api/admin/volunteer-sessions?clubId=<uuid>&status=pending|approved|rejected → { sessions }

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { listVolunteerSessions } from '@/lib/admin/service';
import { fail, unauthorized } from '@/lib/utils/http';
import type { VolunteerStatus } from '@/lib/types/volunteer';

const STATUSES: VolunteerStatus[] = ['pending', 'approved', 'rejected'];

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const status = req.nextUrl.searchParams.get('status');
  if (status && !STATUSES.includes(status as VolunteerStatus)) return fail('Invalid status', 400);

  const result = await listVolunteerSessions(
    user.id,
    req.nextUrl.searchParams.get('clubId') ?? '',
    (status as VolunteerStatus | null) ?? undefined
  );
  if (!result.success) return fail(result.error);
  return NextResponse.json({ sessions: result.data });
}
