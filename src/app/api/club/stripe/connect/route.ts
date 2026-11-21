/**
 * POST /api/club/stripe/connect
 *
 * Initiates Stripe Connect onboarding for a club.
 * Body: { club_id }
 * Returns: { onboarding_url }
 *
 * GET /api/club/stripe/connect?club_id=<uuid>
 * Returns the club's Stripe Connect status + dashboard link.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import {
  createConnectAccount,
  refreshConnectStatus,
  getConnectDashboardLink,
} from '@/lib/stripe/connect';

async function assertClubAdmin(userId: string, clubId: string) {
  const { data } = await createAdminClient()
    .from('club_members')
    .select('role')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle();
  return data?.role === 'club_admin';
}

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { club_id?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const clubId = body.club_id;
  if (!clubId) return NextResponse.json({ error: 'Missing club_id' }, { status: 400 });
  if (!(await assertClubAdmin(user.id, clubId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Get club name
    const { data: club } = await createAdminClient()
      .from('clubs')
      .select('name')
      .eq('id', clubId)
      .maybeSingle();

    const { onboardingUrl } = await createConnectAccount(
      clubId,
      club?.name ?? 'ClubPulse Club',
      user.email ?? '',
    );

    return NextResponse.json({ onboarding_url: onboardingUrl });
  } catch (err) {
    console.error('[stripe/connect] error:', err);
    return NextResponse.json(
      { error: 'Could not start Stripe Connect onboarding' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const clubId = req.nextUrl.searchParams.get('club_id');
  if (!clubId) return NextResponse.json({ error: 'Missing club_id' }, { status: 400 });
  if (!(await assertClubAdmin(user.id, clubId))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const account = await refreshConnectStatus(clubId);
    if (!account) {
      return NextResponse.json({ connected: false });
    }

    let dashboardUrl: string | null = null;
    if (account.onboarding_complete) {
      dashboardUrl = await getConnectDashboardLink(account.stripe_account_id);
    }

    return NextResponse.json({
      connected: true,
      ...account,
      dashboard_url: dashboardUrl,
    });
  } catch (err) {
    console.error('[stripe/connect] GET error:', err);
    return NextResponse.json(
      { error: 'Could not fetch Stripe Connect status' },
      { status: 500 },
    );
  }
}
