// POST /api/community/safety { action: 'report', kind, targetId, reason? } → report to ShiftUp
// POST /api/community/safety { action: 'block', userId }                  → block someone

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, readJson, unauthorized } from '@/lib/utils/http';
import { block, communityOpen, report } from '@/lib/community/service';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const body = (await readJson(req)) as { action?: unknown; userId?: unknown } | null;
  const result = body?.action === 'block' ? await block(user.id, body.userId) : await report(user.id, body);
  return result.success ? NextResponse.json(result.data) : fail(result.error);
}
