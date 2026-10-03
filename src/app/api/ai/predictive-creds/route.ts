// POST /api/ai/predictive-creds → { forecast, currentPace, nextTier, sessionsNeeded, message }
// Auth: Bearer access token (Expo) or cookie session (web).

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { predictSeasonCreds } from '@/lib/ai/predictive-creds';
import { unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  try {
    return NextResponse.json(await predictSeasonCreds(user.id));
  } catch {
    return NextResponse.json({ error: 'Could not build your forecast' }, { status: 500 });
  }
}
