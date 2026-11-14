// ─────────────────────────────────────────────
// GET /api/clubwatch/reports
// Fetch the current user's ClubWatch reports.
// Query params: ?status=pending|verified|rejected  (optional filter)
// Auth: Bearer (Expo) or cookie (web).
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';

export async function GET(req: NextRequest) {
  const { supabase, user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const status = req.nextUrl.searchParams.get('status');

  let query = supabase
    .from('clubwatch_reports')
    .select('id, category, note, photo_url, status, scores_awarded, review_note, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (status && ['pending', 'verified', 'rejected'].includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('ClubWatch reports error:', error);
    return NextResponse.json({ error: 'Could not fetch reports' }, { status: 500 });
  }

  return NextResponse.json({ reports: data ?? [] });
}
