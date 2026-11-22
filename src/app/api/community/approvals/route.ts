// A parent's approvals for their child's connections with another young person (the same flow as /parent/community on the site).
// GET  /api/community/approvals                                          → connections waiting on you, for each child you are verified for
// POST /api/community/approvals { connectionId, childId, approve: bool } → approve or decline for that child
// Both children's parents are asked; it opens when each child has an approving parent, and any decline closes it.
// Shut while the Community or under-18s are switched off.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { communityOpen, juniorsOpen, JUNIORS_OFF } from '@/lib/community/service';
import { decideJuniorConnection, getApprovalsForParent } from '@/lib/community/junior-approval';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  if (!juniorsOpen()) return fail(JUNIORS_OFF, 404);
  const r = await getApprovalsForParent(user.id);
  return r.success ? NextResponse.json({ approvals: r.data }) : fail(r.error);
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  if (!juniorsOpen()) return fail(JUNIORS_OFF, 404);
  const b = (await readJson(req)) as { connectionId?: unknown; childId?: unknown; approve?: unknown } | null;
  // An answer has to be an explicit yes or no; a missing one is never read as either
  if (typeof b?.connectionId !== 'string' || typeof b.childId !== 'string' || typeof b.approve !== 'boolean') return fail('Choose approve or decline.', 400);
  const r = await decideJuniorConnection(user.id, b.connectionId, b.childId, b.approve);
  return r.success ? NextResponse.json(r.data) : fail(r.error);
}
