/**
 * GET /api/admin/club-context
 * Returns the authenticated user's clubId and whether they have admin/coach role.
 * Used by client components that need the clubId without a server component parent.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ clubId: null, isAdmin: false });

    const { data } = await supabase
      .from('club_members')
      .select('club_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!data) return NextResponse.json({ clubId: null, isAdmin: false });

    const isAdmin = ['admin', 'club_admin', 'coach'].includes(data.role);
    return NextResponse.json({ clubId: data.club_id, isAdmin, role: data.role });
  } catch {
    return NextResponse.json({ clubId: null, isAdmin: false });
  }
}
