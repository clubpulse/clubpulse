'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import { getAdminContext } from '@/lib/auth/admin';
import type { ActionResult } from '@/lib/types/action';

export type ScratchCardPrize = {
  id: string;
  club_id: string;
  label: string;
  prize_type: 'scores' | 'gift_card' | 'club_reward' | 'try_again';
  scores_amount: number | null;
  reward_id: string | null;
  club_reward_desc: string | null;
  weight: number;
  weekly_cap: number | null;
  is_active: boolean;
};

export type ScratchCardConfig = {
  id: string;
  club_id: string;
  cost_scores: number;
  milestone_scores: number | null;
  is_active: boolean;
};

export type ScratchCard = {
  id: string;
  club_id: string;
  user_id: string;
  source: 'purchased' | 'milestone' | 'bonus' | 'event';
  scores_spent: number;
  status: 'unscratched' | 'scratched';
  prize_id: string | null;
  prize_snapshot: Record<string, unknown> | null;
  scratched_at: string | null;
  created_at: string;
};

// ── Admin ────────────────────────────────────────────────────────────────────

export async function getScratchCardConfig(clubId: string): Promise<ActionResult<ScratchCardConfig | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scratch_card_config')
    .select('*')
    .eq('club_id', clubId)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ScratchCardConfig | null };
}

export async function upsertScratchCardConfig(
  clubId: string,
  values: Pick<ScratchCardConfig, 'cost_scores' | 'milestone_scores' | 'is_active'>,
): Promise<ActionResult<ScratchCardConfig>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scratch_card_config')
    .upsert({ club_id: clubId, ...values, updated_at: new Date().toISOString() }, { onConflict: 'club_id' })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ScratchCardConfig };
}

export async function getScratchCardPrizes(clubId: string): Promise<ActionResult<ScratchCardPrize[]>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scratch_card_prizes')
    .select('*')
    .eq('club_id', clubId)
    .order('weight', { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ScratchCardPrize[] };
}

export async function upsertScratchCardPrize(
  clubId: string,
  prize: Omit<ScratchCardPrize, 'club_id'> & { id?: string },
): Promise<ActionResult<ScratchCardPrize>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const supabase = await createClient();
  const payload = { ...prize, club_id: clubId };

  const { data, error } = prize.id
    ? await supabase.from('scratch_card_prizes').update(payload).eq('id', prize.id).select().single()
    : await supabase.from('scratch_card_prizes').insert(payload).select().single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ScratchCardPrize };
}

export async function deleteScratchCardPrize(clubId: string, prizeId: string): Promise<ActionResult<void>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('scratch_card_prizes')
    .delete()
    .eq('id', prizeId)
    .eq('club_id', clubId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function getClubScratchCards(clubId: string): Promise<ActionResult<ScratchCard[]>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scratch_cards')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ScratchCard[] };
}

export async function adminAwardScratchCard(
  clubId: string,
  userId: string,
): Promise<ActionResult<{ card_id: string }>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('award_scratch_card', {
    p_user_id: userId,
    p_club_id: clubId,
    p_source: 'bonus',
  });
  if (error) return { success: false, error: error.message };
  const result = data as { ok: boolean; error?: string; card_id?: string };
  if (!result.ok) return { success: false, error: result.error ?? 'Unknown error' };
  return { success: true, data: { card_id: result.card_id! } };
}

// ── Player ───────────────────────────────────────────────────────────────────

export async function getMyUnscratched(clubId: string): Promise<ActionResult<ScratchCard[]>> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scratch_cards')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .eq('status', 'unscratched')
    .order('created_at', { ascending: true });
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ScratchCard[] };
}

export async function buyAndRevealScratchCard(clubId: string): Promise<ActionResult<{
  card_id: string;
  prize: { type: string; label: string; scores_amount?: number; reward_id?: string; club_reward?: string };
}>> {
  const user = await requireUser();
  const supabase = await createClient();

  // Buy
  const { data: buyData, error: buyError } = await supabase.rpc('buy_scratch_card', {
    p_user_id: user.id,
    p_club_id: clubId,
  });
  if (buyError) return { success: false, error: buyError.message };
  const buy = buyData as { ok: boolean; error?: string; card_id?: string };
  if (!buy.ok) {
    const msgs: Record<string, string> = {
      scratch_cards_not_enabled: 'Scratch cards are not enabled for this club.',
      insufficient_scores: 'Not enough Scores.',
    };
    return { success: false, error: msgs[buy.error ?? ''] ?? buy.error ?? 'Unknown error' };
  }

  // Reveal
  const { data: revealData, error: revealError } = await supabase.rpc('reveal_scratch_card', {
    p_user_id: user.id,
    p_card_id: buy.card_id,
  });
  if (revealError) return { success: false, error: revealError.message };
  const reveal = revealData as { ok: boolean; error?: string; prize?: Record<string, unknown> };
  if (!reveal.ok) return { success: false, error: reveal.error ?? 'Unknown error' };

  return {
    success: true,
    data: {
      card_id: buy.card_id!,
      prize: reveal.prize as { type: string; label: string; scores_amount?: number; reward_id?: string; club_reward?: string },
    },
  };
}

export async function revealExistingCard(cardId: string): Promise<ActionResult<{
  prize: { type: string; label: string; scores_amount?: number; reward_id?: string; club_reward?: string };
}>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('reveal_scratch_card', {
    p_user_id: user.id,
    p_card_id: cardId,
  });
  if (error) return { success: false, error: error.message };
  const result = data as { ok: boolean; error?: string; prize?: Record<string, unknown> };
  if (!result.ok) return { success: false, error: result.error ?? 'Unknown error' };

  return {
    success: true,
    data: {
      prize: result.prize as { type: string; label: string; scores_amount?: number; reward_id?: string; club_reward?: string },
    },
  };
}
