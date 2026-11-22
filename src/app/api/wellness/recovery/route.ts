// GET    /api/wellness/recovery            → your recovery log, newest first
// POST   /api/wellness/recovery { soreness, activity, notes } → today's entry
// DELETE /api/wellness/recovery?id=<entry> → remove one of your entries

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { deleteRecoveryFor, recoveryLogFor, saveRecoveryFor } from '@/lib/wellness/service';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const r = await recoveryLogFor(user.id);
  return r.success ? NextResponse.json({ rows: r.data }) : fail(r.error);
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const r = await saveRecoveryFor(user.id, await readJson(req));
  return r.success ? NextResponse.json({ ok: true }) : fail(r.error);
}

export async function DELETE(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return fail('Nothing to remove.');
  const r = await deleteRecoveryFor(user.id, id);
  return r.success ? NextResponse.json({ ok: true }) : fail(r.error);
}
