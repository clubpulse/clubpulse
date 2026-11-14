// POST /api/ai/predictive-scores → { forecast, currentPace, nextTier, sessionsNeeded, message }
// Auth: Bearer access token (Expo) or cookie session (web).

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { predictSeasonScores } from '@/lib/ai/predictive-scores';
import { unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  try {
    return NextResponse.json(await predictSeasonScores(user.id));
  } catch {
    return NextResponse.json({ error: 'Could not build your forecast' }, { status: 500 });
  }
}
