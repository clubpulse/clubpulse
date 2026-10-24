'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type { Badge, PlayerBadge, LeaderboardEntry } from '@/lib/types/badges';

// ── Get all badges earned by a user (all time + current season) ─────────────

export async function getMyBadges(userId: string): Promise<ActionResult<PlayerBadge[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('player_badges')
    .select('*, badge:badges(*)')
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as PlayerBadge[] };
}

// ── Get the club Scores leaderboard (top 20) ────────────────────────────────

export async function getClubLeaderboard(clubId: string): Promise<ActionResult<LeaderboardEntry[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('club_scores_leaderboard')
    .select('*')
    .eq('club_id', clubId)
    .order('rank', { ascending: true })
    .limit(20);

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as LeaderboardEntry[] };
}

// ── Full badge catalogue ─────────────────────────────────────────────────────

export async function getAllBadges(): Promise<ActionResult<Badge[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .eq('is_active', true)
    .order('rarity', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Badge[] };
}

// ── Award a badge (admin / system) ──────────────────────────────────────────

export async function awardBadge(
  userId: string,
  badgeSlug: string,
  clubId: string,
  reason?: string,
): Promise<ActionResult<{ ok: boolean; badge?: string; error?: string }>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('award_badge', {
    p_user_id: userId,
    p_badge_slug: badgeSlug,
    p_club_id: clubId,
    p_reason: reason ?? null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as { ok: boolean; badge?: string; error?: string } };
}

// ── Auto-check and award earned badges ──────────────────────────────────────

export async function checkAndAwardBadges(
  userId: string,
  clubId: string,
): Promise<ActionResult<string[]>> {
  const supabase = await createClient();
  const awarded: string[] = [];

  // Fetch wallet balance
  const { data: wallet } = await supabase
    .from('creds_wallet')
    .select('flexi_balance, reward_balance')
    .eq('user_id', userId)
    .single();

  const totalScores =
    (wallet?.flexi_balance ?? 0) + (wallet?.reward_balance ?? 0);

  // Fetch already-earned badge slugs this season
  const currentYear = new Date().getFullYear();
  const { data: earned } = await supabase
    .from('player_badges')
    .select('badge:badges(slug)')
    .eq('user_id', userId)
    .eq('season', currentYear);

  const earnedSlugs = new Set(
    (earned ?? []).flatMap((pb: { badge: { slug: string } | null }) =>
      pb.badge ? [pb.badge.slug] : [],
    ),
  );

  async function tryAward(slug: string, reason: string) {
    if (earnedSlugs.has(slug)) return;
    const result = await awardBadge(userId, slug, clubId, reason);
    if (result.success && result.data.ok) awarded.push(slug);
  }

  // Milestone: Scores thresholds
  if (totalScores >= 100) await tryAward('century-scores', `Reached ${totalScores} Scores`);
  if (totalScores >= 500) await tryAward('five-hundred-scores', `Reached ${totalScores} Scores`);
  if (totalScores >= 1000) await tryAward('thousand-scores', `Reached ${totalScores} Scores`);

  // Mentor sessions
  const { count: mentorCount } = await supabase
    .from('mentor_sessions')
    .select('*', { count: 'exact', head: true })
    .or(`mentor_id.eq.${userId},mentee_id.eq.${userId}`)
    .eq('status', 'completed');

  if ((mentorCount ?? 0) >= 1) await tryAward('mentor-first', 'Completed first mentoring session');
  if ((mentorCount ?? 0) >= 10) await tryAward('mentor-veteran', 'Completed 10+ mentoring sessions');

  return { success: true, data: awarded };
}
