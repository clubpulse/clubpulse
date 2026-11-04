/**
 * GET /api/fixtures?clubId=...&upcoming=true
 *
 * Returns fixtures for a club. With upcoming=true, returns only future fixtures.
 * Used by the opposition intelligence page to populate the fixture picker.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clubId = searchParams.get('clubId');
    const upcoming = searchParams.get('upcoming') === 'true';

    if (!clubId) return NextResponse.json({ error: 'clubId required' }, { status: 400 });

    // Verify the user belongs to this club
    const admin = createAdminClient();
    const { data: membership } = await admin
      .from('club_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('club_id', clubId)
      .eq('is_active', true)
      .maybeSingle();

    if (!membership) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    let query = admin
      .from('fixtures')
      .select('id, opponent, match_date, venue, format, result')
      .eq('club_id', clubId)
      .order('match_date', { ascending: true });

    if (upcoming) {
      query = query.gte('match_date', new Date().toISOString().split('T')[0]);
    }

    const { data: fixtures, error } = await query.limit(20);
    if (error) throw error;

    return NextResponse.json({ fixtures: fixtures ?? [] });
  } catch (err) {
    console.error('[fixtures GET]', err);
    return NextResponse.json({ error: 'Failed to fetch fixtures' }, { status: 500 });
  }
}
