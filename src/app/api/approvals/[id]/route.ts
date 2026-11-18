// POST /api/approvals/:id  Body: { action: 'approve' | 'reject' }
// Club admins approve a parent link ('link:<id>') or a coach ('coach:<id>') from the app.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { approveRequest } from '@/lib/mobile/club-data';
import { decideJoinRequest } from '@/lib/mobile/club-admin';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Context) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const body = (await readJson(req)) as { action?: unknown } | null;
  const { id } = await params;
  const approvalId = decodeURIComponent(id);

  // A join request can be declined here: nothing is lost by turning one away. Declining a parent
  // link or a coach touches safeguarding records, so that stays on the web dashboard.
  if (body?.action === 'reject') {
    if (!approvalId.startsWith('join:')) return fail('This kind of request can only be declined from the web dashboard', 400);
    const declined = await decideJoinRequest(user.id, approvalId.slice(5), false);
    if (!declined.success) return fail(declined.error, 404);
    return NextResponse.json({ ok: true });
  }
  if (body?.action !== 'approve') return fail('Unknown action', 400);

  const result = await approveRequest(user.id, approvalId);
  if (!result.success) return fail(result.error, result.error === 'Request not found' ? 404 : 403);
  return NextResponse.json({ ok: true });
}
