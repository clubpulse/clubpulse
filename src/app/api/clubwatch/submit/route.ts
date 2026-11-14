// ─────────────────────────────────────────────
// POST /api/clubwatch/submit
// Submit a new ClubWatch report. Auth: Bearer (Expo) or cookie (web).
// Body: { category, note, photoUrl?, latitude?, longitude? }
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_CATEGORIES = [
  'pitch', 'equipment', 'facilities', 'safety',
  'cleanliness', 'vandalism', 'improvement', 'positive',
];

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { category, note, photoUrl, latitude, longitude } = body as {
    category: string;
    note: string;
    photoUrl?: string;
    latitude?: number;
    longitude?: number;
  };

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  if (!note || note.trim().length < 5) {
    return NextResponse.json({ error: 'Note must be at least 5 characters' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find user's active club
  const { data: membership } = await admin
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!membership?.club_id) {
    return NextResponse.json({ error: 'You are not a member of any club' }, { status: 403 });
  }

  // Rate limit: max 10 reports per day per user
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { count } = await admin
    .from('clubwatch_reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', todayStart.toISOString());

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Daily report limit reached (10 per day)' }, { status: 429 });
  }

  // Insert the report
  const { data: report, error } = await admin
    .from('clubwatch_reports')
    .insert({
      club_id: membership.club_id,
      user_id: user.id,
      category,
      note: note.trim(),
      photo_url: photoUrl ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    })
    .select('id, category, status, created_at')
    .single();

  if (error) {
    console.error('ClubWatch submit error:', error);
    return NextResponse.json({ error: 'Could not submit report' }, { status: 500 });
  }

  return NextResponse.json({ success: true, report });
}
