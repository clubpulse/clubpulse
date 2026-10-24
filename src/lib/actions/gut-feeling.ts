'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/lib/types/action';
import type { GutPrediction, GutFeelingSeason, PredictionOutcome } from '@/lib/types/gut-feeling';

/** Fixtures the current user has NOT yet predicted on and have no result yet */
export async function getUpcomingFixturesForPrediction(clubId: string): Promise<
  ActionResult<Array<{ id: string; opponent: string; match_date: string; venue?: string }>>
> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Fixtures with no result yet
    const { data: fixtures, error: fixturesErr } = await supabase
      .from('fixtures')
      .select('id, opponent, match_date, venue')
      .eq('club_id', clubId)
      .is('result', null)
      .gte('match_date', new Date().toISOString())
      .order('match_date', { ascending: true });

    if (fixturesErr) return { success: false, error: fixturesErr.message };
    if (!fixtures || fixtures.length === 0) return { success: true, data: [] };

    // Exclude fixtures the user already predicted
    const fixtureIds = fixtures.map((f: { id: string }) => f.id);
    const { data: existing } = await supabase
      .from('gut_predictions')
      .select('fixture_id')
      .eq('user_id', user.id)
      .in('fixture_id', fixtureIds);

    const predictedIds = new Set((existing ?? []).map((p: { fixture_id: string }) => p.fixture_id));
    const unpredicted = fixtures.filter((f: { id: string }) => !predictedIds.has(f.id));

    return { success: true, data: unpredicted };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** All predictions for the current user, with fixture info */
export async function getMyPredictions(userId: string): Promise<ActionResult<GutPrediction[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('gut_predictions')
      .select(`
        *,
        fixtures!fixture_id (
          opponent,
          match_date,
          result
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const predictions: GutPrediction[] = (data ?? []).map((row: Record<string, unknown>) => {
      const fixture = row.fixtures as { opponent: string; match_date: string; result?: string } | null;
      return {
        id: row.id as string,
        user_id: row.user_id as string,
        fixture_id: row.fixture_id as string,
        prediction: row.prediction as PredictionOutcome,
        is_correct: row.is_correct as boolean | null,
        creds_awarded: row.creds_awarded as number,
        created_at: row.created_at as string,
        fixture: fixture
          ? {
              opponent: fixture.opponent,
              match_date: fixture.match_date,
              result: fixture.result ?? undefined,
            }
          : undefined,
      };
    });

    return { success: true, data: predictions };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Submit or update a gut prediction for a fixture */
export async function submitPrediction(
  fixtureId: string,
  prediction: PredictionOutcome,
): Promise<ActionResult<GutPrediction>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('gut_predictions')
      .upsert(
        { user_id: user.id, fixture_id: fixtureId, prediction },
        { onConflict: 'user_id,fixture_id', ignoreDuplicates: false },
      )
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as GutPrediction };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Season accuracy stats for a user */
export async function getMySeasonStats(userId: string): Promise<ActionResult<GutFeelingSeason>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('gut_predictions')
      .select('is_correct, creds_awarded, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const rows = data ?? [];
    const resolved = rows.filter((r: Record<string, unknown>) => r.is_correct !== null);
    const correct = resolved.filter((r: Record<string, unknown>) => r.is_correct === true);
    const totalCreds = rows.reduce(
      (sum: number, r: Record<string, unknown>) => sum + (r.creds_awarded as number),
      0,
    );

    // Current streak: consecutive correct from most recent resolved
    let streak = 0;
    for (const row of resolved) {
      if ((row as Record<string, unknown>).is_correct === true) {
        streak++;
      } else {
        break;
      }
    }

    const stats: GutFeelingSeason = {
      total_predictions: rows.length,
      correct_predictions: correct.length,
      accuracy_percent:
        resolved.length > 0 ? Math.round((correct.length / resolved.length) * 100) : 0,
      total_creds_earned: totalCreds,
      current_streak: streak,
    };

    return { success: true, data: stats };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Admin: resolve predictions for a fixture with the actual result */
export async function adminResolvePredictions(
  fixtureId: string,
  result: PredictionOutcome,
): Promise<ActionResult<{ correct_count: number }>> {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin.rpc('resolve_gut_predictions', {
      p_fixture_id: fixtureId,
      p_result: result,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data: { correct_count: data as number } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Admin: list fixtures with pending (unresolved) predictions and distribution */
export async function adminGetPendingFixtures(clubId: string): Promise<
  ActionResult<
    Array<{
      fixture_id: string
      opponent: string
      match_date: string
      total_predictions: number
      distribution: Record<PredictionOutcome, number>
    }>
  >
> {
  try {
    const supabase = await createClient();

    // Fixtures with at least one pending prediction
    const { data, error } = await supabase
      .from('gut_predictions')
      .select(`
        fixture_id,
        prediction,
        is_correct,
        fixtures!fixture_id (
          opponent,
          match_date,
          result,
          club_id
        )
      `)
      .is('is_correct', null);

    if (error) return { success: false, error: error.message };

    // Group by fixture, filter to this club
    const byFixture = new Map<
      string,
      {
        fixture_id: string
        opponent: string
        match_date: string
        distribution: Record<PredictionOutcome, number>
      }
    >();

    for (const row of data ?? []) {
      const f = row.fixtures as {
        opponent: string
        match_date: string
        result?: string
        club_id: string
      } | null;
      if (!f || f.club_id !== clubId) continue;

      const existing = byFixture.get(row.fixture_id) ?? {
        fixture_id: row.fixture_id,
        opponent: f.opponent,
        match_date: f.match_date,
        distribution: { win: 0, loss: 0, draw: 0, rain: 0 },
      };
      existing.distribution[row.prediction as PredictionOutcome]++;
      byFixture.set(row.fixture_id, existing);
    }

    const result2 = Array.from(byFixture.values()).map((entry) => ({
      ...entry,
      total_predictions: Object.values(entry.distribution).reduce((a, b) => a + b, 0),
    }));

    result2.sort(
      (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime(),
    );

    return { success: true, data: result2 };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
