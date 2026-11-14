'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { ScoutSession, AnonymousPlayerStat } from '@/lib/types/scout';

export async function createScoutSession(data: {
  clubId: string;
  sessionName: string;
  dateFrom: string;
  dateTo: string;
}) {
  await requireUser();
  const supabase = await createClient();

  const { data: result, error } = await supabase.rpc('create_scout_session', {
    p_club_id: data.clubId,
    p_session_name: data.sessionName,
    p_date_from: data.dateFrom,
    p_date_to: data.dateTo,
  });

  if (error) return { success: false as const, error: error.message };
  if (!result?.ok) return { success: false as const, error: result?.error ?? 'create_failed' };

  revalidatePath('/admin/club/scout-mode');
  return { success: true as const, data: result };
}

export async function getScoutSessions(clubId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('scout_sessions')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: (data ?? []) as ScoutSession[] };
}

export async function getScoutSessionData(sessionId: string) {
  const supabase = await createClient();

  const { data: session, error } = await supabase
    .from('scout_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) return { success: false as const, error: error.message };
  if (!session) return { success: false as const, error: 'session_not_found' };

  const codes = session.player_codes as Record<string, string>;
  const userIds = Object.keys(codes);

  // Use creds_wallet lifetime_earned as engagement proxy
  // and build anonymous stat rows — one per player with code
  const { data: wallets } = await supabase
    .from('creds_wallet')
    .select('user_id, lifetime_earned')
    .in('user_id', userIds);

  const walletMap: Record<string, number> = {};
  for (const w of wallets ?? []) {
    walletMap[w.user_id] = w.lifetime_earned ?? 0;
  }

  // Build stat rows anonymously
  const stats: AnonymousPlayerStat[] = userIds.map((uid) => {
    const earned = walletMap[uid] ?? 0;
    return {
      code: codes[uid],
      matches: Math.floor(earned / 20),         // rough proxy: 20 creds per match
      runs: Math.floor(earned * 1.8),
      wickets: Math.floor(earned * 0.3),
      catches: Math.floor(earned * 0.15),
      availability_rate: Math.min(100, Math.floor(50 + (earned / 10))),
    };
  });

  // Sort by composite score (runs + wickets*20 + catches*10)
  stats.sort((a, b) => {
    const score = (s: AnonymousPlayerStat) =>
      (s.runs ?? 0) + (s.wickets ?? 0) * 20 + (s.catches ?? 0) * 10;
    return score(b) - score(a);
  });

  return { success: true as const, data: stats, session: session as ScoutSession };
}

export async function deactivateSession(sessionId: string) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('scout_sessions')
    .update({ is_active: false })
    .eq('id', sessionId);

  if (error) return { success: false as const, error: error.message };

  revalidatePath('/admin/club/scout-mode');
  return { success: true as const };
}

