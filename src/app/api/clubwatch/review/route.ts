// ─────────────────────────────────────────────
// POST /api/clubwatch/review
// Club admin verifies or rejects a report.
// Body: { reportId, action: 'verify' | 'reject', reviewNote? }
// Awards Scores to the reporter when verified.
// Auth: Bearer (Expo) or cookie (web).
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { reportId, action, reviewNote } = body as {
    reportId: string;
    action: 'verify' | 'reject';
    reviewNote?: string;
  };

  if (!reportId || !['verify', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'reportId and action (verify|reject) required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch the report
  const { data: report } = await admin
    .from('clubwatch_reports')
    .select('id, club_id, user_id, category, status')
    .eq('id', reportId)
    .single();

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  if (report.status !== 'pending') {
    return NextResponse.json({ error: 'Report already reviewed' }, { status: 400 });
  }

  // Check the reviewer is an admin of this club
  const { data: adminMembership } = await admin
    .from('club_members')
    .select('role')
    .eq('club_id', report.club_id)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .in('role', ['admin', 'owner', 'committee'])
    .maybeSingle();

  if (!adminMembership) {
    return NextResponse.json({ error: 'Not authorised to review reports for this club' }, { status: 403 });
  }

  // Get the category's Scores value
  let scoresToAward = 0;
  if (action === 'verify') {
    const { data: cat } = await admin
      .from('clubwatch_categories')
      .select('scores')
      .eq('key', report.category)
      .single();
    scoresToAward = cat?.scores ?? 10;
  }

  // Update the report
  const { error: updateError } = await admin
    .from('clubwatch_reports')
    .update({
      status: action === 'verify' ? 'verified' : 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote ?? null,
      scores_awarded: scoresToAward,
    })
    .eq('id', reportId);

  if (updateError) {
    console.error('ClubWatch review error:', updateError);
    return NextResponse.json({ error: 'Could not update report' }, { status: 500 });
  }

  // Award Scores to the reporter's wallet if verified
  if (action === 'verify' && scoresToAward > 0) {
    const { error: walletError } = await admin.rpc('award_scores', {
      p_user_id: report.user_id,
      p_amount: scoresToAward,
      p_reason: `ClubWatch: ${report.category} report verified`,
      p_source: 'clubwatch',
    });

    // If the RPC doesn't exist yet, fall back to direct wallet update
    if (walletError?.code === '42883') {
      // Function doesn't exist — increment flexi_balance directly
      await admin
        .from('creds_wallet')
        .update({
          flexi_balance: admin.rpc('increment_balance', {
            row_user_id: report.user_id,
            amount: scoresToAward,
          }),
        })
        .eq('user_id', report.user_id);

      // If that also fails, try a simple approach
      const { data: wallet } = await admin
        .from('creds_wallet')
        .select('flexi_balance')
        .eq('user_id', report.user_id)
        .single();

      if (wallet) {
        await admin
          .from('creds_wallet')
          .update({ flexi_balance: wallet.flexi_balance + scoresToAward })
          .eq('user_id', report.user_id);
      }
    }
  }

  return NextResponse.json({
    success: true,
    status: action === 'verify' ? 'verified' : 'rejected',
    scoresAwarded: scoresToAward,
  });
}
