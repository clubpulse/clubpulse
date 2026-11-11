'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { isPlatformAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTangoApiConfigured } from '@/lib/tango/client';
import type { ActionResult } from '@/lib/types/action';
import type { GiftCardOrder, GiftCardOrderKind } from '@/lib/types/gift-card-orders';

// Gift cards waiting to be ordered by hand in the Tango portal. ClubPulse staff only: the Tango
// account belongs to ClubPulse, not to a club. Everything here runs on the server.

async function requirePlatformAdmin() {
  const user = await requireUser();
  return isPlatformAdmin(user.id) ? user : null;
}

type RewardRef = { title: string | null; tango_utid: string | null; tango_amount_gbp: number | string | null };

export async function getGiftCardQueue(): Promise<ActionResult<{ orders: GiftCardOrder[]; apiConfigured: boolean }>> {
  if (!(await requirePlatformAdmin())) return { success: false, error: 'Not authorised' };
  const admin = createAdminClient();

  const [{ data: redemptions, error: rErr }, { data: cards, error: cErr }] = await Promise.all([
    admin.from('reward_redemptions')
      .select('id, user_id, redeemed_at, notes, rewards_catalogue!inner(title, tango_utid, tango_amount_gbp)')
      .in('status', ['pending', 'tango_pending'])
      .not('rewards_catalogue.tango_utid', 'is', null)
      .order('redeemed_at', { ascending: true })
      .limit(200),
    admin.from('scratch_cards')
      .select('id, user_id, scratched_at, prize_snapshot, fulfilment_notes')
      .in('fulfilment_status', ['pending', 'failed'])
      .eq('prize_snapshot->>type', 'gift_card')
      .order('scratched_at', { ascending: true })
      .limit(200),
  ]);
  if (rErr || cErr) return { success: false, error: 'Could not load the gift card queue.' };

  // Rewards behind scratch card prizes
  const rewardIds = [...new Set((cards ?? []).map((c) => (c.prize_snapshot as { reward_id?: string } | null)?.reward_id).filter(Boolean))] as string[];
  const { data: rewards } = rewardIds.length
    ? await admin.from('rewards_catalogue').select('id, title, tango_utid, tango_amount_gbp').in('id', rewardIds)
    : { data: [] };
  const rewardOf = new Map((rewards ?? []).map((r) => [r.id as string, r as RewardRef]));

  // Names and email addresses
  const userIds = [...new Set([...(redemptions ?? []).map((r) => r.user_id as string), ...(cards ?? []).map((c) => c.user_id as string)])];
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, full_name, display_name').in('id', userIds)
    : { data: [] };
  const nameOf = new Map((profiles ?? []).map((p) => [p.id as string, ((p.full_name as string) || (p.display_name as string) || 'Player')]));
  const emailOf = new Map<string, string | null>();
  await Promise.all(userIds.map(async (id) => {
    const { data } = await admin.auth.admin.getUserById(id);
    emailOf.set(id, data?.user?.email ?? null);
  }));

  const toOrder = (kind: GiftCardOrderKind, id: string, userId: string, reward: RewardRef | undefined, fallbackTitle: string, at: string, note: string | null): GiftCardOrder => ({
    kind, id,
    player_name: nameOf.get(userId) ?? 'Player',
    email: emailOf.get(userId) ?? null,
    reward_title: reward?.title ?? fallbackTitle,
    amount_gbp: reward?.tango_amount_gbp != null ? Number(reward.tango_amount_gbp) : null,
    tango_utid: reward?.tango_utid ?? null,
    requested_at: at,
    note,
  });

  const orders: GiftCardOrder[] = [
    ...(redemptions ?? []).map((r) => toOrder('redemption', r.id as string, r.user_id as string,
      r.rewards_catalogue as unknown as RewardRef, 'Gift card', r.redeemed_at as string, (r.notes as string | null) ?? null)),
    ...(cards ?? []).map((c) => {
      const snap = (c.prize_snapshot ?? {}) as { label?: string; reward_id?: string };
      return toOrder('scratch_card', c.id as string, c.user_id as string, snap.reward_id ? rewardOf.get(snap.reward_id) : undefined,
        snap.label ?? 'Gift card', (c.scratched_at as string) ?? '', (c.fulfilment_notes as string | null) ?? null);
    }),
  ].sort((a, b) => a.requested_at.localeCompare(b.requested_at));

  return { success: true, data: { orders, apiConfigured: isTangoApiConfigured() } };
}

/**
 * Records that a gift card has been ordered in the Tango portal. Tango emails the reward to the
 * player, so the code is optional; if one is entered the player also sees it in the app.
 */
export async function markGiftCardSent(
  kind: GiftCardOrderKind,
  id: string,
  values: { code?: string; reference?: string },
): Promise<ActionResult<void>> {
  const user = await requirePlatformAdmin();
  if (!user) return { success: false, error: 'Not authorised' };
  const admin = createAdminClient();
  const code = values.code?.trim().slice(0, 200) || null;
  const reference = values.reference?.trim().slice(0, 100) || null;
  const note = `Ordered by hand by ${user.id}`;

  if (kind === 'redemption') {
    const { data, error } = await admin.from('reward_redemptions')
      .update({ status: 'fulfilled', tango_reference: reference, voucher_token: code, notes: note })
      .eq('id', id).in('status', ['pending', 'tango_pending']).select('id');
    if (error || !data?.length) return { success: false, error: 'That gift card is no longer waiting.' };
  } else if (kind === 'scratch_card') {
    const { data, error } = await admin.from('scratch_cards')
      .update({ fulfilment_status: 'fulfilled', provider_reference: reference, voucher_token: code, fulfilment_notes: note })
      .eq('id', id).in('fulfilment_status', ['pending', 'failed']).select('id');
    if (error || !data?.length) return { success: false, error: 'That gift card is no longer waiting.' };
  } else {
    return { success: false, error: 'Unknown order type.' };
  }

  revalidatePath('/admin/gift-cards');
  return { success: true, data: undefined };
}
