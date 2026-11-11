'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTangoApiConfigured, placeTangoOrder } from '@/lib/tango/client';
import { AGE_GATE_MESSAGE, isActiveMember, isAdultPlayer } from '@/lib/scores/context';
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

// ── Gift card fulfilment ─────────────────────────────────────────────────────
// Server-side only: the gift card provider keys never reach the browser. A failure here never
// fails the reveal. The card is left as 'failed' with a note so an admin can retry it.

async function fulfilGiftCardPrize(
  userId: string,
  cardId: string,
  rewardId: string,
): Promise<{ token: string | null; instructions: string | null; expiry: string | null } | null> {
  const admin = createAdminClient();
  const fail = async (note: string) => {
    await admin.from('scratch_cards').update({ fulfilment_status: 'failed', fulfilment_notes: note.slice(0, 500) }).eq('id', cardId);
    return null;
  };

  // No API access yet: leave the card pending for a manual order (see /admin/gift-cards)
  if (!isTangoApiConfigured()) {
    await admin.from('scratch_cards').update({ fulfilment_notes: 'Waiting for manual order' })
      .eq('id', cardId).eq('user_id', userId).eq('fulfilment_status', 'pending');
    return null;
  }

  // Only cards that belong to this player and are still waiting can be issued. A repeat request
  // for the same card is safe: the card id is the provider's external reference (see below).
  const { data: claimed } = await admin
    .from('scratch_cards')
    .update({ fulfilment_notes: 'Issuing gift card' })
    .eq('id', cardId)
    .eq('user_id', userId)
    .in('fulfilment_status', ['pending', 'failed'])
    .is('provider_reference', null)
    .select('id');
  if (!claimed || claimed.length === 0) return null;

  const { data: reward } = await admin
    .from('rewards_catalogue')
    .select('tango_utid, tango_amount_gbp')
    .eq('id', rewardId)
    .maybeSingle();
  if (!reward?.tango_utid || !reward.tango_amount_gbp) return fail('Prize is not linked to a gift card in the rewards catalogue');

  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (!email) return fail('Player has no email address on file');

  try {
    // cardId is the external reference, so the provider treats a repeat as the same order
    const order = await placeTangoOrder(reward.tango_utid as string, Number(reward.tango_amount_gbp), email, cardId);
    if (!order.ok) return fail(order.error ?? 'Gift card provider declined the order');

    const voucher = {
      token: order.reward?.token ?? null,
      instructions: order.reward?.redemptionInstructions ?? null,
      expiry: order.reward?.expirationDate ?? null,
    };
    await admin.from('scratch_cards').update({
      fulfilment_status: 'fulfilled',
      provider_reference: order.referenceOrderID ?? null,
      voucher_token: voucher.token,
      voucher_instructions: voucher.instructions,
      voucher_expiry: voucher.expiry,
      fulfilment_notes: null,
    }).eq('id', cardId);
    return voucher;
  } catch (err) {
    return fail(`Gift card provider error: ${String(err)}`);
  }
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

// The scratch card SQL functions are executable by the service role only, so they are called
// with the admin client and the user id that requireUser() has just verified.
async function reveal(userId: string, cardId: string): Promise<ActionResult<{ prize: ScratchPrize }>> {
  const { data, error } = await createAdminClient().rpc('reveal_scratch_card', { p_user_id: userId, p_card_id: cardId });
  if (error) return { success: false, error: 'Could not reveal this card. Please try again.' };
  const result = data as { ok: boolean; error?: string; prize?: ScratchPrize };
  if (!result.ok || !result.prize) {
    const msgs: Record<string, string> = {
      not_found: 'That card could not be found.',
      already_scratched: 'That card has already been scratched.',
    };
    return { success: false, error: msgs[result.error ?? ''] ?? 'Could not reveal this card.' };
  }

  const prize: ScratchPrize = { ...result.prize };
  if (prize.type === 'gift_card' && prize.reward_id) {
    prize.voucher = await fulfilGiftCardPrize(userId, cardId, prize.reward_id);
    prize.pending = !prize.voucher;
  } else if (prize.type === 'club_reward' || prize.type === 'gift_card') {
    prize.pending = true;
  }
  revalidatePath('/scratch-cards');
  return { success: true, data: { prize } };
}

export async function buyAndRevealScratchCard(clubId: string): Promise<ActionResult<{ card_id: string; prize: ScratchPrize }>> {
  const user = await requireUser();
  if (!(await isAdultPlayer(user.id, clubId))) return { success: false, error: AGE_GATE_MESSAGE };

  const { data: buyData, error: buyError } = await createAdminClient().rpc('buy_scratch_card', {
    p_user_id: user.id,
    p_club_id: clubId,
  });
  if (buyError) return { success: false, error: 'Could not buy a card. Please try again.' };
  const buy = buyData as { ok: boolean; error?: string; card_id?: string };
  if (!buy.ok || !buy.card_id) {
    const msgs: Record<string, string> = {
      scratch_cards_not_enabled: 'Scratch cards are not enabled for this club.',
      insufficient_scores: 'Not enough Scores.',
    };
    return { success: false, error: msgs[buy.error ?? ''] ?? 'Could not buy a card.' };
  }

  const res = await reveal(user.id, buy.card_id);
  if (!res.success) return res;
  return { success: true, data: { card_id: buy.card_id, prize: res.data.prize } };
}

export async function revealExistingCard(cardId: string): Promise<ActionResult<{ prize: ScratchPrize }>> {
  const user = await requireUser();

  // The card's own club decides the age gate; reveal() checks the card belongs to this player
  const { data: card } = await createAdminClient().from('scratch_cards').select('club_id').eq('id', cardId).eq('user_id', user.id).maybeSingle();
  if (!card) return { success: false, error: 'That card could not be found.' };
  if (!(await isAdultPlayer(user.id, card.club_id as string))) return { success: false, error: AGE_GATE_MESSAGE };

  return reveal(user.id, cardId);
}
