import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createShift,
  updateShift,
  deleteShift,
  listShifts,
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

// GET /api/club/volunteers/shifts — list shifts with optional filters
export async function GET(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = await getAdminClubId(user.id);
    if (!clubId) return NextResponse.json({ error: 'Not a club admin' }, { status: 403 });

    const url = new URL(req.url);
    const from = url.searchParams.get('from') ?? undefined;
    const to = url.searchParams.get('to') ?? undefined;
    const role = url.searchParams.get('role') as import('@/lib/types/volunteer-shifts').ShiftRole | undefined;

    const shifts = await listShifts(clubId, { from, to, role: role || undefined });
    return NextResponse.json({ shifts });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST /api/club/volunteers/shifts — create a new shift
export async function POST(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = await getAdminClubId(user.id);
    if (!clubId) return NextResponse.json({ error: 'Not a club admin' }, { status: 403 });

    const body = await req.json();
    const result = await createShift(clubId, user.id, body);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ shift: result.data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH /api/club/volunteers/shifts — update a shift
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = await getAdminClubId(user.id);
    if (!clubId) return NextResponse.json({ error: 'Not a club admin' }, { status: 403 });

    const body = await req.json();
    const { shiftId, ...updates } = body;
    if (!shiftId) return NextResponse.json({ error: 'shiftId required' }, { status: 400 });

    const result = await updateShift(shiftId, clubId, updates);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ shift: result.data });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE /api/club/volunteers/shifts — delete a shift
export async function DELETE(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = await getAdminClubId(user.id);
    if (!clubId) return NextResponse.json({ error: 'Not a club admin' }, { status: 403 });

    const url = new URL(req.url);
    const shiftId = url.searchParams.get('id');
    if (!shiftId) return NextResponse.json({ error: 'id param required' }, { status: 400 });

    const result = await deleteShift(shiftId, clubId);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
