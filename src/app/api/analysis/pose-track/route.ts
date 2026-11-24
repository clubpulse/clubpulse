/**
 * POST /api/analysis/pose-track
 *
 * Pose tracking runs on the player's device. This route used to spawn a Python
 * script that is not part of the production server, so it no longer accepts an
 * upload. A signed-in caller gets a clear refusal. Anyone else is unauthorised.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  return NextResponse.json(
    { error: 'Pose tracking runs on your device. This server route does not accept video uploads.' },
    { status: 410 },
  );
}
