import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateClubProfile } from '@/lib/admin/club-service';
import type { ClubProfileUpdate } from '@/lib/admin/club-service';

async function getAdminClubId(userId: string): Promise<string | null> {
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

export async function PATCH(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const clubId = await getAdminClubId(user.id);
  if (!clubId) return NextResponse.json({ success: false, error: 'No club admin access' }, { status: 403 });

  let body: ClubProfileUpdate;
  try {
    body = (await req.json()) as ClubProfileUpdate;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const result = await updateClubProfile(user.id, clubId, body);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
