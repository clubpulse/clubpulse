// GET /api/community/nearby?scope=…&want=net_partner|club|coach|teammates → people to meet

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, unauthorized } from '@/lib/utils/http';
import { communityOpen, getNearby } from '@/lib/community/service';
import { LOOKING_FOR, isScope, type LookingFor } from '@/lib/community/rules';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const scope = req.nextUrl.searchParams.get('scope');
  const want = req.nextUrl.searchParams.get('want');
  const result = await getNearby(user.id, isScope(scope) ? scope : 'club', (LOOKING_FOR as readonly string[]).includes(want ?? '') ? (want as LookingFor) : null);
  return result.success ? NextResponse.json(result.data) : fail(result.error);
}
