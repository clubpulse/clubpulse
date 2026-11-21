/**
 * PATCH /api/club/coaches/certifications
 * Body: { club_id, cert_id }
 * Verify a coach certification (admin only).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyCertification } from '@/lib/admin/coach-service';

export async function PATCH(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  let body: { club_id?: string; cert_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.cert_id) return NextResponse.json({ success: false, error: 'Missing cert_id' }, { status: 400 });

  // Resolve club
  let clubId = body.club_id;
  if (!clubId) {
    const { data } = await createAdminClient()
      .from('club_members')
      .select('club_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('role', ['club_admin'])
      .limit(1)
      .maybeSingle();
    clubId = data?.club_id;
  }
  if (!clubId) return NextResponse.json({ success: false, error: 'No club context' }, { status: 400 });

  const result = await verifyCertification(user.id, clubId, body.cert_id);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
