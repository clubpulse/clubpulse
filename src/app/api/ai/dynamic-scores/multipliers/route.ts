// GET /api/ai/dynamic-scores/multipliers?clubId=<uuid> → { multipliers }
// Multipliers currently in force: platform-wide, plus the club's own if clubId is given.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getActiveMultipliers } from '@/lib/ai/dynamic-scores';
import { fail, unauthorized } from '@/lib/utils/http';
import { isUuid } from '@/lib/utils/validate';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const clubId = req.nextUrl.searchParams.get('clubId');
  if (clubId && !isUuid(clubId)) return fail('Invalid clubId', 400);

  const multipliers = await getActiveMultipliers(clubId);
  return NextResponse.json({ multipliers });
}
