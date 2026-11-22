// GET  /api/wellness/share → your clubs and whether you share readiness averages with their coaches
// POST /api/wellness/share { clubId, share } → turn sharing on or off for one club (off is always allowed; under-18s cannot turn it on)

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { setShareFor, shareSettingsFor } from '@/lib/wellness/service';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const r = await shareSettingsFor(user.id);
  return r.success ? NextResponse.json({ clubs: r.data }) : fail(r.error);
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  const body = (await readJson(req)) as { clubId?: unknown; share?: unknown } | null;
  if (typeof body?.clubId !== 'string' || typeof body.share !== 'boolean') return fail('Choose a club and on or off.');
  const r = await setShareFor(user.id, body.clubId, body.share);
  return r.success ? NextResponse.json({ ok: true }) : fail(r.error);
}
