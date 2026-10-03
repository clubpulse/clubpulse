// POST /api/volunteer/check-in  { role, sessionDate, lat, lng, clubId? }
// → { sessionId, gpsConfirmed, distanceMetres, credsAwarded }
// The user must be an active member of the club. The club ground location comes from the
// clubs table (ground_lat / ground_lng), never from the client.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkInVolunteer } from '@/lib/volunteer/verify';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { isUuid } from '@/lib/utils/validate';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const body = (await readJson(req)) as {
    role?: unknown; sessionDate?: unknown; lat?: unknown; lng?: unknown; clubId?: unknown;
  } | null;
  if (
    typeof body?.role !== 'string' || typeof body.sessionDate !== 'string' ||
    typeof body.lat !== 'number' || typeof body.lng !== 'number'
  ) {
    return fail('role, sessionDate, lat and lng are required', 400);
  }
  if (body.clubId !== undefined && !isUuid(body.clubId)) return fail('Invalid clubId', 400);

  const admin = createAdminClient();
  const { data: memberships } = await admin
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const clubIds = (memberships ?? []).map((m) => m.club_id as string);
  if (clubIds.length === 0) return fail('Join a club before checking in', 403);

  let clubId: string;
  if (body.clubId) {
    if (!clubIds.includes(body.clubId as string)) return fail('You are not a member of that club', 403);
    clubId = body.clubId as string;
  } else if (clubIds.length === 1) {
    clubId = clubIds[0];
  } else {
    return fail('You belong to more than one club: send clubId', 400);
  }

  const { data: club } = await admin.from('clubs').select('ground_lat, ground_lng').eq('id', clubId).maybeSingle();
  if (typeof club?.ground_lat !== 'number' || typeof club?.ground_lng !== 'number') {
    return fail('This club has not set its ground location yet', 422);
  }

  const result = await checkInVolunteer({
    userId: user.id,
    clubId,
    role: body.role,
    sessionDate: body.sessionDate,
    lat: body.lat,
    lng: body.lng,
    clubLat: club.ground_lat,
    clubLng: club.ground_lng,
  });
  if (!result.success) return fail(result.error, /already checked in/i.test(result.error) ? 409 : 400);
  return NextResponse.json(result.data, { status: 201 });
}
