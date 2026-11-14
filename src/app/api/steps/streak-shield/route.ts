// ─────────────────────────────────────────────
// POST /api/steps/streak-shield
// Spend 20 Scores to protect a streak you're about to break.
// The Duolingo mechanic — call before midnight if no steps logged.
// Auth: Bearer access token (Expo) or cookie session (web).
// All checks + the deduct + the steps_log write happen atomically in the
// use_streak_shield SQL function (see migration 20260928000004).
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';

type ShieldResult =
  | { ok: true; cost: number; streak_protected: number; balance: number }
  | { ok: false; error: 'insufficient_creds'; balance: number; cost: number }
  | { ok: false; error: 'already_protected' | 'steps_already_logged' | 'no_active_streak' };

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await createAdminClient().rpc('use_streak_shield', {
    p_user_id: user.id,
  });
  if (error) return NextResponse.json({ error: 'Failed to use streak shield' }, { status: 500 });

  const result = data as ShieldResult;

  if (!result.ok) {
    switch (result.error) {
      case 'insufficient_creds':
        return NextResponse.json(
          { error: `Not enough Scores. Need ${result.cost}, have ${result.balance}.` },
          { status: 402 }
        );
      case 'already_protected':
        return NextResponse.json({ error: 'Streak already protected for today' }, { status: 409 });
      case 'steps_already_logged':
        return NextResponse.json({ error: 'Steps already logged today, nothing to protect' }, { status: 409 });
      case 'no_active_streak':
        return NextResponse.json({ error: 'No active streak to protect' }, { status: 400 });
    }
  }

  return NextResponse.json({
    success:         true,
    scoresCost:       result.cost,
    streakProtected: result.streak_protected,
  });
}
