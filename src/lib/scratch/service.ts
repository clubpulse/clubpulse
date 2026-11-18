// Server-only. Scratch cards for a member whose id the caller has already verified. Kept out of
// the server-actions file on purpose: every export there can be called from a browser with any
// arguments, and these functions take a user id.
//
// Cards are earned (tasks the club chooses, check-in streaks, Scores milestones, awards from the
// club), never bought.

import { createAdminClient } from '@/lib/supabase/admin';
import { isTangoApiConfigured, placeTangoOrder } from '@/lib/tango/client';
import { AGE_GATE_MESSAGE, getPrimaryClubId, isAdultPlayer } from '@/lib/scores/context';
import type { ActionResult } from '@/lib/types/action';
import type { ScratchPrize } from '@/lib/actions/scratch-cards';
import { chances, type PoolPrize } from '@/lib/scratch/logic';
import { CARD_TASKS, taskLine } from '@/lib/scratch/tasks';

// ── Gift card fulfilment ─────────────────────────────────────────────────────
// Server-side only: the gift card provider keys never reach the browser. A failure here never
// fails the reveal. The card is left as 'failed' with a note so an admin can retry it.

export async function fulfilGiftCardPrize(
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

// ── Reveal ───────────────────────────────────────────────────────────────────

/** Reveals one of the member's own waiting cards. The draw happens in the database. */
export async function revealCardForUser(userId: string, cardId: string): Promise<ActionResult<{ prize: ScratchPrize }>> {
  const admin = createAdminClient();

  // The card's own club decides the age gate
  const { data: card } = await admin.from('scratch_cards').select('club_id').eq('id', cardId).eq('user_id', userId).maybeSingle();
  if (!card) return { success: false, error: 'That card could not be found.' };
  if (!(await isAdultPlayer(userId, card.club_id as string))) return { success: false, error: AGE_GATE_MESSAGE };

  const { data, error } = await admin.rpc('reveal_scratch_card', { p_user_id: userId, p_card_id: cardId });
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
  return { success: true, data: { prize } };
}

// ── For the app ──────────────────────────────────────────────────────────────

export type MyScratchCards = {
  /** Why cards cannot be opened right now, or null. */
  unavailable: string | null;
  /** 'junior' = switched off for this account; 'confirm' = must confirm they are 18 or over. */
  gate: 'junior' | 'confirm' | null;
  waiting: Array<{ id: string; source: string; earned_at: string }>;
  opened: Array<{ id: string; label: string; type: string; opened_at: string; pending: boolean; code: string | null }>;
  /** What a card can hold and how likely each prize is, as whole percentages. */
  prizes: Array<{ label: string; chance: number }>;
  /** How cards are earned at this club. */
  milestone: number | null;
  /** Tasks this club rewards with a card, each as a line ready to show. */
  tasks: string[];
};

const SOURCE_LABEL: Record<string, string> = {
  milestone: 'Scores milestone',
  task: 'Task completed',
  game: 'Game card',
  bonus: 'Bonus card',
  event: 'Event card',
  purchased: 'Card',
};

export async function getMyScratchCards(userId: string): Promise<MyScratchCards> {
  const empty: MyScratchCards = { unavailable: null, gate: null, waiting: [], opened: [], prizes: [], milestone: null, tasks: [] };
  const clubId = await getPrimaryClubId(userId);
  if (!clubId) return { ...empty, unavailable: 'Join a club to earn scratch cards.' };

  const admin = createAdminClient();
  const [{ data: config }, { data: pool }, { data: waiting }, { data: opened }, { data: profile }, { data: junior }] = await Promise.all([
    admin.from('scratch_card_config').select('is_active, milestone_scores').eq('club_id', clubId).maybeSingle(),
    admin.from('scratch_card_prizes').select('label, weight, prize_type').eq('club_id', clubId).eq('is_active', true),
    admin.from('scratch_cards').select('id, source, created_at').eq('user_id', userId).eq('status', 'unscratched').order('created_at', { ascending: true }).limit(50),
    admin.from('scratch_cards').select('id, prize_snapshot, scratched_at, fulfilment_status, voucher_token').eq('user_id', userId).eq('status', 'scratched').order('scratched_at', { ascending: false }).limit(10),
    admin.from('profiles').select('age_confirmed_18').eq('id', userId).maybeSingle(),
    admin.from('club_members').select('club_id').eq('user_id', userId).eq('club_id', clubId).eq('is_junior', true).limit(1),
  ]);

  if (!config?.is_active) return { ...empty, unavailable: 'Your club has not switched scratch cards on.' };

  const isJunior = (junior ?? []).length > 0;
  return {
    unavailable: null,
    gate: isJunior ? 'junior' : profile?.age_confirmed_18 ? null : 'confirm',
    waiting: (waiting ?? []).map((c) => ({ id: c.id as string, source: SOURCE_LABEL[c.source as string] ?? 'Card', earned_at: c.created_at as string })),
    opened: (opened ?? []).map((c) => {
      const snap = (c.prize_snapshot ?? {}) as { label?: string; type?: string };
      return {
        id: c.id as string,
        label: snap.label ?? 'Prize',
        type: snap.type ?? 'unknown',
        opened_at: (c.scratched_at as string) ?? '',
        pending: c.fulfilment_status === 'pending' || c.fulfilment_status === 'failed',
        code: (c.voucher_token as string | null) ?? null,
      };
    }),
    prizes: chances((pool ?? []) as PoolPrize[]),
    milestone: (config.milestone_scores as number | null) ?? null,
    tasks: await getTaskLines(userId, clubId),
  };
}

/** How this member earns cards from tasks at their club. Empty if the club rewards none, or on any error. */
export async function getTaskLines(userId: string, clubId: string): Promise<string[]> {
  const admin = createAdminClient();
  const [{ data: tasks }, { data: progress }] = await Promise.all([
    admin.from('scratch_card_tasks').select('task, every_n').eq('club_id', clubId).eq('is_active', true),
    admin.from('scratch_card_task_progress').select('task').eq('user_id', userId).eq('club_id', clubId).limit(5000),
  ]);
  const done = new Map<string, number>();
  for (const p of progress ?? []) done.set(p.task as string, (done.get(p.task as string) ?? 0) + 1);
  const on = new Map((tasks ?? []).map((t) => [t.task as string, t.every_n as number]));
  return CARD_TASKS.filter((t) => on.has(t.key)).map((t) => taskLine(t.key, on.get(t.key)!, done.get(t.key) ?? 0));
}

/** Records that the member says they are 18 or over. Juniors cannot switch the gate off this way. */
export async function confirmAdultForUser(userId: string): Promise<ActionResult<void>> {
  const { error } = await createAdminClient()
    .from('profiles')
    .update({ age_confirmed_18: true, age_confirmed_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) return { success: false, error: 'Could not save. Please try again.' };
  return { success: true, data: undefined };
}
