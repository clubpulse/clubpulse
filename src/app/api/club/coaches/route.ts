/**
 * GET /api/club/coaches?club_id=<uuid>
 * List all coaches for a club (admin only).
 *
 * PATCH /api/club/coaches
 * Body: { club_id, coach_profile_id, action: 'approve' | 'reject' }
 * Approve or reject a coach.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { listCoaches, approveCoach, rejectCoach } from '@/lib/admin/coach-service';

async function getAdminClubId(userId: string, requestedClubId?: string | null) {
  if (requestedClubId) return requestedClubId;
  const { data } = await createAdminClient()
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role', ['club_admin', 'admin'])
    .limit(1)
    .maybeSingle();
  return data?.club_id ?? null;
}

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const clubId = await getAdminClubId(user.id, req.nextUrl.searchParams.get('club_id'));
  if (!clubId) return NextResponse.json({ success: false, error: 'No club context' }, { status: 400 });

  const result = await listCoaches(user.id, clubId);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}

export async function PATCH(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  let body: { club_id?: string; coach_profile_id?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const clubId = await getAdminClubId(user.id, body.club_id);
  if (!clubId) return NextResponse.json({ success: false, error: 'No club context' }, { status: 400 });
  if (!body.coach_profile_id) return NextResponse.json({ success: false, error: 'Missing coach_profile_id' }, { status: 400 });

  const result =
    body.action === 'approve'
      ? await approveCoach(user.id, clubId, body.coach_profile_id)
      : body.action === 'reject'
        ? await rejectCoach(user.id, clubId, body.coach_profile_id)
        : { success: false as const, error: 'Invalid action' };

  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
