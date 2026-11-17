// POST /api/approvals/:id  Body: { action: 'approve' }
// Club admins approve a parent link ('link:<id>') or a coach ('coach:<id>') from the app.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { approveRequest } from '@/lib/mobile/club-data';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

type Context = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Context) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const body = (await readJson(req)) as { action?: unknown } | null;
  if (body?.action !== 'approve') return fail('Requests can only be declined from the web dashboard', 400);

  const { id } = await params;
  const result = await approveRequest(user.id, decodeURIComponent(id));
  if (!result.success) return fail(result.error, result.error === 'Request not found' ? 404 : 403);
  return NextResponse.json({ ok: true });
}
