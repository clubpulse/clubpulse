// Adult-to-junior contact, parent first. Needs COMMUNITY_CROSSBAND_ENABLED as well as COMMUNITY_ENABLED.
// GET  /api/community/guardian                                    → requests about your children (as a parent)
// POST /api/community/guardian { action: 'ask', juniorId, note }   → a coach asks a parent
// POST /api/community/guardian { action: 'decide', id, approve }   → a parent approves or declines
// POST /api/community/guardian { action: 'end', id }               → end or withdraw

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { communityOpen } from '@/lib/community/service';
import { crossBandOpen, decideAsParent, endContact, getParentRequests, requestJunior } from '@/lib/community/guardian';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen() || !crossBandOpen()) return fail('This is not open yet.', 404);
  const r = await getParentRequests(user.id);
  return r.success ? NextResponse.json({ requests: r.data }) : fail(r.error);
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen() || !crossBandOpen()) return fail('This is not open yet.', 404);
  const b = (await readJson(req)) as { action?: unknown; juniorId?: unknown; note?: unknown; id?: unknown; approve?: unknown } | null;
  if (b?.action === 'ask' && typeof b.juniorId === 'string') {
    const r = await requestJunior(user.id, b.juniorId, b.note);
    return r.success ? NextResponse.json(r.data) : fail(r.error);
  }
  if (b?.action === 'decide' && typeof b.id === 'string') {
    const r = await decideAsParent(user.id, b.id, b.approve === true);
    return r.success ? NextResponse.json(r.data) : fail(r.error);
  }
  if (b?.action === 'end' && typeof b.id === 'string') {
    const r = await endContact(user.id, b.id);
    return r.success ? NextResponse.json(r.data) : fail(r.error);
  }
  return fail('Unknown request.', 400);
}
