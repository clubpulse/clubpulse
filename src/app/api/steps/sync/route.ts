// ─────────────────────────────────────────────
// POST /api/steps/sync
// Expo app calls this to log today's step count.
// Auth: Bearer access token (Expo) or cookie session (web).
// Calculates Scores + streak, writes steps_log, awards only the delta
// between the new total and what was already awarded for that day.
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { calcStepsScores } from '@/lib/types/sport';

export async function POST(req: NextRequest) {
  const { supabase, user } = await getRequestAuth(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { stepCount, logDate, source = 'apple_health' } = body as {
    stepCount: number;
    logDate:   string;   // 'YYYY-MM-DD'
    source?:   'apple_health' | 'google_fit' | 'expo_sensors';
  };

  if (!stepCount || !logDate) {
    return NextResponse.json({ error: 'stepCount and logDate required' }, { status: 400 });
  }

  // Only today or yesterday (UTC; allows for timezones and a late sync), and a believable count.
  // Without this a client could sync every past date and farm the daily Scores.
  const utcDate = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
  if (logDate !== utcDate(0) && logDate !== utcDate(-1)) {
    return NextResponse.json({ error: 'logDate must be today or yesterday (YYYY-MM-DD, UTC)' }, { status: 400 });
  }
  if (!Number.isInteger(stepCount) || stepCount < 1 || stepCount > 100_000) {
    return NextResponse.json({ error: 'stepCount must be a whole number from 1 to 100000' }, { status: 400 });
  }
  if (!['apple_health', 'google_fit', 'expo_sensors'].includes(source)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
  }

  // 1. Check if already logged today (idempotent — take the higher count)
  const { data: existing } = await supabase
    .from('steps_log')
    .select('id, step_count, creds_earned, streak_day, streak_protected')
    .eq('user_id', user.id)
    .eq('log_date', logDate)
    .maybeSingle();

  if (existing && existing.step_count >= stepCount) {
    return NextResponse.json({
      ok:          true,
      duplicate:   true,
      stepCount:   existing.step_count,
      streakDay:   existing.streak_day,
    });
  }

  // 2. Get yesterday's streak to continue it
  const yesterday = new Date(logDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const { data: yesterdayLog } = await supabase
    .from('steps_log')
    .select('streak_day, streak_protected')
    .eq('user_id', user.id)
    .eq('log_date', yesterdayStr)
    .maybeSingle();

  // Streak continues if yesterday had steps OR was shield-protected
  const prevStreak = (yesterdayLog?.streak_day ?? 0) > 0
    ? yesterdayLog!.streak_day
    : 0;

  const streakDay = prevStreak + 1;

  // 3. Calculate Scores (streak bonus fires on day 7, 14, 21…) and the delta
  //    over what this day has already been awarded
  const alreadyAwarded = existing?.creds_earned ?? 0;
  const totalScoresToday = Math.max(calcStepsScores(stepCount, prevStreak), alreadyAwarded);
  const scoresDelta = totalScoresToday - alreadyAwarded;

  // 4. Write steps_log. The update is compare-and-set on the previous values, so two
  //    concurrent syncs can't both award the same delta.
  const row = {
    step_count:   stepCount,
    creds_earned: totalScoresToday,
    streak_day:   streakDay,
    source,
    synced_at:    new Date().toISOString(),
  };

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('steps_log')
      .update(row)
      .eq('id', existing.id)
      .eq('step_count', existing.step_count)
      .eq('creds_earned', existing.creds_earned)
      .select('id');

    if (updateError) return NextResponse.json({ error: 'Failed to save steps' }, { status: 500 });
    if (!updated?.length) {
      return NextResponse.json({ error: 'Sync conflict, please retry' }, { status: 409 });
    }
  } else {
    const { error: insertError } = await supabase
      .from('steps_log')
      .insert({ user_id: user.id, log_date: logDate, streak_protected: false, ...row });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Sync conflict, please retry' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to save steps' }, { status: 500 });
    }
  }

  // 5. Award only the delta
  if (scoresDelta > 0) {
    const { error: awardError } = await createAdminClient().rpc('increment_creds_balance', {
      p_user_id: user.id,
      p_amount:  scoresDelta,
    });

    if (awardError) {
      // Undo the write so a retry awards the Scores instead of seeing them as already given
      if (existing) {
        await supabase
          .from('steps_log')
          .update({
            step_count:   existing.step_count,
            creds_earned: existing.creds_earned,
            streak_day:   existing.streak_day,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('steps_log').delete().eq('user_id', user.id).eq('log_date', logDate);
      }
      return NextResponse.json({ error: 'Failed to award Scores' }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok:              true,
    stepCount,
    scoresEarned:     scoresDelta,       // newly awarded by this sync
    totalScoresToday,                   // total awarded for this day so far
    streakDay,
  });
}
