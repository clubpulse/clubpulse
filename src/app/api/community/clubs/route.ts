// GET /api/community/clubs?scope=…&within=5|10|25 → clubs near you, as cards

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { fail, unauthorized } from '@/lib/utils/http';
import { communityOpen, getNearbyClubs } from '@/lib/community/service';
import { isScope } from '@/lib/community/rules';
import { filtersFrom } from '@/lib/community/filters';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  if (!communityOpen()) return fail('The Community is not open yet.', 404);
  const scope = req.nextUrl.searchParams.get('scope');
  const result = await getNearbyClubs(user.id, isScope(scope) ? scope : 'miles', filtersFrom((k) => req.nextUrl.searchParams.get(k)).within);
  return result.success ? NextResponse.json(result.data) : fail(result.error);
}
