import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { listChildren, registerChild, verifyParentLink } from '@/lib/admin/parent-service';

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

async function getParentClubId(userId: string): Promise<string | null> {
  const sb = createAdminClient();
  const { data } = await sb
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single();
  return data?.club_id ?? null;
}

// GET — list children (admin: all club children; parent: own children)
export async function GET(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClubId = await getAdminClubId(user.id);
    if (adminClubId) {
      const children = await listChildren(adminClubId);
      return NextResponse.json({ children });
    }

    // Parent: get own children via links
    const sb = createAdminClient();
    const { data: links } = await sb
      .from('parent_child_links')
      .select('child_id')
      .eq('parent_id', user.id);

    if (!links?.length) return NextResponse.json({ children: [] });

    const childIds = links.map((l) => l.child_id);
    const { data: children } = await sb
      .from('child_profiles')
      .select('*')
      .in('id', childIds);

    return NextResponse.json({ children: children ?? [] });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST — register a child (parent flow)
export async function POST(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = await getParentClubId(user.id);
    if (!clubId) return NextResponse.json({ error: 'Not a club member' }, { status: 403 });

    const body = await req.json();
    const result = await registerChild(clubId, user.id, body);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ child: result.data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PATCH — verify parent-child link (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const { user } = await getRequestAuth(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const clubId = await getAdminClubId(user.id);
    if (!clubId) return NextResponse.json({ error: 'Not a club admin' }, { status: 403 });

    const { linkId } = await req.json();
    if (!linkId) return NextResponse.json({ error: 'linkId required' }, { status: 400 });

    const result = await verifyParentLink(linkId, user.id);
    if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
