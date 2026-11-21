// GET /api/badges → every badge, how far along the caller is, and the share link for each one earned

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getBadges } from '@/lib/mobile/badges';
import { unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();
  return NextResponse.json(await getBadges(user.id));
}
