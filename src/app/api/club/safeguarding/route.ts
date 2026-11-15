import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  reportIncident,
  listIncidents,
  updateIncident,
  addIncidentNote,
  getIncidentDetail,
} from '@/lib/admin/parent-service';
import type { IncidentStatus } from '@/lib/types/parent';

async function getAdminClubId(userId: string): Promise<string | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .in('role', ['admin', 'club_admin'])
    .eq('is_active', true)
    .limit(1)
    .single();
  return data?.club_id ?? null;
}

// GET — list incidents or get detail
export async function GET(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = await getAdminClubId(user.id);
    if (!clubId) return NextResponse.json({ error: 'Not a club admin' }, { status: 403 });

    const url = new URL(req.url);
    const incidentId = url.searchParams.get('id');

    if (incidentId) {
      const detail = await getIncidentDetail(incidentId);
      if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(detail);
    }

    const status = url.searchParams.get('status') as IncidentStatus | undefined;
    const incidents = await listIncidents(clubId, { status: status || undefined });
    return NextResponse.json({ incidents });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST — report a new incident
export async function POST(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = await getAdminClubId(user.id);
    if (!clubId) return NextResponse.json({ error: 'Not a club admin' }, { status: 403 });

    const body = await req.json();
    const result = await reportIncident(clubId, user.id, body);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ incident: result.data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH — update incident or add note
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = await getAdminClubId(user.id);
    if (!clubId) return NextResponse.json({ error: 'Not a club admin' }, { status: 403 });

    const body = await req.json();

    // Add note
    if (body.action === 'add_note') {
      const result = await addIncidentNote(body.incidentId, user.id, body.note, body.is_internal ?? true);
      if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
      return NextResponse.json({ note: result.data });
    }

    // Update incident
    const { incidentId, ...updates } = body;
    if (!incidentId) return NextResponse.json({ error: 'incidentId required' }, { status: 400 });

    const result = await updateIncident(incidentId, updates);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ incident: result.data });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
