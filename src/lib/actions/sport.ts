'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SportConfig, Performance, PerformanceWithSport, EarningCategory } from '@/lib/types/sport';

// ── Sport config queries ───────────────────────────────────────────────────

export async function getActiveSports(): Promise<{ success: true; data: SportConfig[] } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sport_configs')
    .select('*')
    .eq('is_active', true)
    .order('display_name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as SportConfig[] };
}

export async function getSportByName(name: string): Promise<{ success: true; data: SportConfig } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('sport_configs')
    .select('*')
    .eq('name', name)
    .eq('is_active', true)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as SportConfig };
}

// ── Performance logging ────────────────────────────────────────────────────

type LogPerformanceInput = {
  sportName:    string;
  category:     EarningCategory;
  data:         Record<string, number>;
  performedAt?: string;  // ISO string; defaults to now
  source?:      Performance['source'];
  sourceEventId?: string;
};

export async function logPerformance(
  input: LogPerformanceInput
): Promise<{ success: true; data: Performance; scoresEarned: number } | { success: false; error: string }> {
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  // Fetch sport config to calculate Scores
  const sportResult = await getSportByName(input.sportName);
  if (!sportResult.success) return { success: false, error: sportResult.error };
  const sport = sportResult.data;

  // Calculate Scores from earning_rules
  const rules = sport.earning_rules[input.category] ?? {};
  let scoresEarned = 0;
  for (const [metric, value] of Object.entries(input.data)) {
    const rate = rules[metric] ?? 0;
    scoresEarned += Math.floor((value as number) * rate);
  }

  // Insert performance row
  const { data: perf, error } = await supabase
    .from('performances')
    .insert({
      user_id:         user.id,
      sport_id:        sport.id,
      category:        input.category,
      data:            input.data,
      creds_earned:    scoresEarned,
      source:          input.source ?? 'manual',
      source_event_id: input.sourceEventId ?? null,
      performed_at:    input.performedAt ?? new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Award Scores atomically
  if (scoresEarned > 0) {
    const { error: awardError } = await createAdminClient().rpc('increment_creds_balance', {
      p_user_id: user.id,
      p_amount:  scoresEarned,
    });
    if (awardError) return { success: false, error: `Performance saved but Scores award failed: ${awardError.message}` };
  }

  return { success: true, data: perf as Performance, scoresEarned };
}

// ── Performance queries ────────────────────────────────────────────────────

export async function getUserPerformances(options?: {
  sportName?: string;
  category?:  EarningCategory;
  since?:     string;  // ISO date string
  limit?:     number;
}): Promise<{ success: true; data: PerformanceWithSport[] } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  let query = supabase
    .from('performances')
    .select(`*, sport:sport_configs ( name, display_name, icon_emoji )`)
    .eq('user_id', user.id)
    .order('performed_at', { ascending: false });

  if (options?.sportName) {
    // Resolve the sport's id first (PostgREST has no subqueries), then filter on sport_id
    const { data: sportRow, error: sportError } = await supabase
      .from('sport_configs')
      .select('id')
      .eq('name', options.sportName)
      .maybeSingle();
    if (sportError) return { success: false, error: sportError.message };
    if (!sportRow) return { success: true, data: [] };
    query = query.eq('sport_id', sportRow.id);
  }
  if (options?.category) {
    query = query.eq('category', options.category);
  }
  if (options?.since) {
    query = query.gte('performed_at', options.since);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as PerformanceWithSport[] };
}

export async function getPerformanceScoreTotal(since?: string): Promise<{ success: true; total: number } | { success: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  let query = supabase
    .from('performances')
    .select('creds_earned')
    .eq('user_id', user.id);

  if (since) query = query.gte('performed_at', since);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };

  const total = (data ?? []).reduce((sum, row) => sum + (row.creds_earned ?? 0), 0);
  return { success: true, total };
}
