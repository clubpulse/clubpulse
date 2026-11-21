import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  checkoutSignup,
  markNoShow,
  cancelSignup,
} from '@/lib/admin/volunteer-service';

async function getAdminClubId(userId: string): Promise<string | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .in('role', ['club_admin'])
    .eq('is_active', true)
    .limit(1)
    .single();
  return data?.club_id ?? null;
}

// PATCH /api/club/volunteers/signups — admin actions on signups
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = await getAdminClubId(user.id);
    if (!clubId) return NextResponse.json({ error: 'Not a club admin' }, { status: 403 });

    const body = await req.json();
    const { signupId, action, notes } = body as {
      signupId: string;
      action: 'checkout' | 'no_show' | 'cancel';
      notes?: string;
    };

    if (!signupId || !action) {
      return NextResponse.json({ error: 'signupId and action required' }, { status: 400 });
    }

    switch (action) {
      case 'checkout': {
        const result = await checkoutSignup(signupId);
        if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ ok: true, ...result.data });
      }
      case 'no_show': {
        const result = await markNoShow(signupId);
        if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ ok: true });
      }
      case 'cancel': {
        const result = await cancelSignup(signupId);
        if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
