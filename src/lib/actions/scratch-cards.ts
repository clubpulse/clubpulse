'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isActiveMember } from '@/lib/scores/context';
import { fulfilGiftCardPrize, revealCardForUser } from '@/lib/scratch/service';
import { requireUser } from '@/lib/auth/server';
import { getAdminContext } from '@/lib/auth/admin';
import type { ActionResult } from '@/lib/types/action';
import { CARD_TASKS, DEFAULT_EVERY, DEFAULT_WEEKLY_CAP, parseTaskSettings, type CardTaskSetting } from '@/lib/scratch/tasks';

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
  fulfilment_status?: 'none' | 'pending' | 'fulfilled' | 'failed';
  voucher_token?: string | null;
  voucher_instructions?: string | null;
  voucher_expiry?: string | null;
};

export type ScratchPrize = {
  type: string;
  label: string;
  scores_amount?: number;
  reward_id?: string;
  club_reward?: string;
  // Set when a gift card prize was issued straight away
  voucher?: { token: string | null; instructions: string | null; expiry: string | null } | null;
  // True when a gift card or club reward still has to be issued or handed over
  pending?: boolean;
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

export type ScratchCardTaskSettings = { tasks: CardTaskSetting[]; weeklyCap: number };

/** Which tasks give this club's members a scratch card. Every task is listed, on or off. */
export async function getScratchCardTasks(clubId: string): Promise<ActionResult<ScratchCardTaskSettings>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const admin = createAdminClient();
  const [{ data: rows }, { data: config }] = await Promise.all([
    admin.from('scratch_card_tasks').select('task, every_n, is_active').eq('club_id', clubId),
    admin.from('scratch_card_config').select('task_weekly_cap').eq('club_id', clubId).maybeSingle(),
  ]);
  const saved = new Map((rows ?? []).map((r) => [r.task as string, r]));
  return {
    success: true,
    data: {
      tasks: CARD_TASKS.map((t) => ({
        task: t.key,
        every_n: (saved.get(t.key)?.every_n as number | undefined) ?? DEFAULT_EVERY[t.key],
        is_active: !!saved.get(t.key)?.is_active,
      })),
      weeklyCap: (config?.task_weekly_cap as number | undefined) ?? DEFAULT_WEEKLY_CAP,
    },
  };
}

export async function saveScratchCardTasks(clubId: string, tasks: unknown, weeklyCap: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const parsed = parseTaskSettings(tasks, weeklyCap);
  if ('error' in parsed) return { success: false, error: parsed.error };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: config } = await admin.from('scratch_card_config').select('id').eq('club_id', clubId).maybeSingle();
  if (!config) return { success: false, error: 'Save the scratch card settings above first.' };

  const { error: capError } = await admin.from('scratch_card_config').update({ task_weekly_cap: parsed.weeklyCap, updated_at: now }).eq('club_id', clubId);
  if (capError) return { success: false, error: 'Could not save. Has the latest database update been run?' };

  if (parsed.tasks.length > 0) {
    const { error } = await admin
      .from('scratch_card_tasks')
      .upsert(parsed.tasks.map((t) => ({ club_id: clubId, ...t, updated_at: now })), { onConflict: 'club_id,task' });
    if (error) return { success: false, error: 'Could not save. Has the latest database update been run?' };
  }
  revalidatePath('/admin/club/scratch-cards');
  revalidatePath('/scratch-cards');
  return { success: true, data: undefined };
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

  if (!(await isActiveMember(userId, clubId))) return { success: false, error: 'That player is not a member of this club.' };

  // award_scratch_card is executable by the service role only
  const { data, error } = await createAdminClient().rpc('award_scratch_card', {
    p_user_id: userId,
    p_club_id: clubId,
    p_source: 'bonus',
  });
  if (error) return { success: false, error: error.message };
  const result = data as { ok: boolean; error?: string; card_id?: string };
  if (!result.ok) return { success: false, error: result.error ?? 'Unknown error' };
  return { success: true, data: { card_id: result.card_id! } };
}

// ── Admin: prizes waiting to be handed over ──────────────────────────────────

export async function getPendingScratchPrizes(clubId: string): Promise<ActionResult<Array<ScratchCard & { player_name: string }>>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('scratch_cards')
    .select('*')
    .eq('club_id', clubId)
    .in('fulfilment_status', ['pending', 'failed'])
    .order('scratched_at', { ascending: true })
    .limit(100);
  if (error) return { success: false, error: error.message };
  const cards = (data ?? []) as ScratchCard[];
  const { data: names } = cards.length
    ? await admin.from('profiles').select('id, full_name, display_name').in('id', cards.map((c) => c.user_id))
    : { data: [] };
  const nameOf = new Map((names ?? []).map((n) => [n.id as string, ((n.display_name as string) || (n.full_name as string) || 'Player')]));
  return { success: true, data: cards.map((c) => ({ ...c, player_name: nameOf.get(c.user_id) ?? 'Player' })) };
}

/** Club rewards (free match fee and so on) are handed over in person; this records that it happened. */
export async function markScratchPrizeFulfilled(clubId: string, cardId: string): Promise<ActionResult<void>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const { error } = await createAdminClient()
    .from('scratch_cards')
    .update({ fulfilment_status: 'fulfilled', fulfilment_notes: `Marked handed over by ${user.id}` })
    .eq('id', cardId)
    .eq('club_id', clubId)
    .in('fulfilment_status', ['pending', 'failed']);
  if (error) return { success: false, error: error.message };
  revalidatePath('/admin/club/scratch-cards');
  return { success: true, data: undefined };
}

/** Retry issuing a gift card that could not be issued when the card was scratched. */
export async function retryScratchGiftCard(clubId: string, cardId: string): Promise<ActionResult<void>> {
  const user = await requireUser();
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) return { success: false, error: 'Not authorised' };

  const admin = createAdminClient();
  const { data: card } = await admin
    .from('scratch_cards')
    .select('id, user_id, prize_snapshot, fulfilment_status')
    .eq('id', cardId)
    .eq('club_id', clubId)
    .maybeSingle();
  const rewardId = (card?.prize_snapshot as { type?: string; reward_id?: string } | null)?.reward_id;
  if (!card || card.fulfilment_status === 'fulfilled' || !rewardId) return { success: false, error: 'Nothing to retry for this card.' };

  const voucher = await fulfilGiftCardPrize(card.user_id as string, cardId, rewardId);
  revalidatePath('/admin/club/scratch-cards');
  return voucher ? { success: true, data: undefined } : { success: false, error: 'The gift card could not be issued. Check the note on the card.' };
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

export async function getMyScratchedCards(clubId: string): Promise<ActionResult<ScratchCard[]>> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scratch_cards')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .eq('status', 'scratched')
    .order('scratched_at', { ascending: false })
    .limit(20);
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ScratchCard[] };
}

// Scratch cards are earned, never bought. A card used to be bought with Scores, which meant staking
// something of value on a chance. Cards now come only from milestones, check-in streaks and awards.
export async function buyAndRevealScratchCard(_clubId: string): Promise<ActionResult<{ card_id: string; prize: ScratchPrize }>> {
  await requireUser();
  return { success: false, error: 'Scratch cards are earned, not bought. Keep a check-in streak or reach a Scores milestone to get one.' };
}

export async function revealExistingCard(cardId: string): Promise<ActionResult<{ prize: ScratchPrize }>> {
  const user = await requireUser();
  const res = await revealCardForUser(user.id, cardId);
  if (res.success) revalidatePath('/scratch-cards');
  return res;
}
