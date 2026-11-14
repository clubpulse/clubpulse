// POST /api/ai/sporting-soul
// Generates a personalised season narrative for the authenticated user.
// Auth: Bearer access token (Expo) or cookie session (web).

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { generateSportingSoul } from '@/lib/ai/sporting-soul';
import type { PerformanceWithSport } from '@/lib/types/sport';

export async function POST(req: NextRequest) {
  const { supabase, user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const athleteName = profile?.full_name ?? user.email?.split('@')[0] ?? 'Athlete';

  const seasonStart = `${new Date().getFullYear()}-01-01`;
  const { data: performances, error } = await supabase
    .from('performances')
    .select(`*, sport:sport_configs ( name, display_name, icon_emoji )`)
    .eq('user_id', user.id)
    .gte('performed_at', seasonStart)
    .order('performed_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    const soul = await generateSportingSoul(
      athleteName,
      (performances ?? []) as PerformanceWithSport[],
      { season: new Date().getFullYear().toString() }
    );
    return NextResponse.json(soul);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'AI generation failed' },
      { status: 500 }
    );
  }
}
