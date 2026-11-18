'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { isPlatformAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/lib/types/action';
import type { Delivery, MerchState } from '@/lib/merch/logic';
import type { MerchOrder } from '@/lib/types/merch-orders';

// Merchandise orders waiting to be placed with the print supplier by hand. ClubPulse staff only:
// the orders hold members' home addresses. Everything here runs on the server.

async function requirePlatformAdmin() {
  const user = await requireUser();
  return isPlatformAdmin(user.id) ? user : null;
}

type Stored = Delivery & { state?: MerchState; supplier_reference?: string | null };

export async function getMerchQueue(): Promise<ActionResult<MerchOrder[]>> {
  if (!(await requirePlatformAdmin())) return { success: false, error: 'Not authorised' };
  const admin = createAdminClient();

  const { data, error } = await admin.from('reward_redemptions')
    .select('id, user_id, redeemed_at, fulfilment_data, rewards_catalogue!inner(title)')
    .eq('status', 'pending')
    .not('fulfilment_data->merch', 'is', null)
    .order('redeemed_at', { ascending: true })
    .limit(200);
  if (error) return { success: false, error: 'Could not load merchandise orders. Has the merchandise database change been run?' };

  const userIds = [...new Set((data ?? []).map((r) => r.user_id as string))];
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, full_name, display_name').in('id', userIds)
    : { data: [] };
  const nameOf = new Map((profiles ?? []).map((p) => [p.id as string, ((p.full_name as string) || (p.display_name as string) || 'Member')]));
  const emailOf = new Map<string, string | null>();
  await Promise.all(userIds.map(async (id) => {
    const { data: found } = await admin.auth.admin.getUserById(id);
    emailOf.set(id, found?.user?.email ?? null);
  }));

  const orders: MerchOrder[] = (data ?? []).map((r) => {
    const merch = (r.fulfilment_data as { merch: Stored }).merch;
    return {
      id: r.id as string,
      player_name: nameOf.get(r.user_id as string) ?? 'Member',
      email: emailOf.get(r.user_id as string) ?? null,
      item: (r.rewards_catalogue as unknown as { title: string }).title,
      delivery: { size: merch.size ?? null, name: merch.name, line1: merch.line1, line2: merch.line2 ?? null, town: merch.town, postcode: merch.postcode },
      state: merch.state === 'ordered' ? 'ordered' : 'to_order',
      supplier_reference: merch.supplier_reference ?? null,
      ordered_at: r.redeemed_at as string,
    };
  });
  return { success: true, data: orders };
}

/** Step 1: the order has been placed with the supplier. Step 2: it has been posted, which closes it. */
export async function updateMerchOrder(
  id: string,
  step: 'ordered' | 'sent',
  supplierReference?: string,
): Promise<ActionResult<void>> {
  const user = await requirePlatformAdmin();
  if (!user) return { success: false, error: 'Not authorised' };
  const admin = createAdminClient();

  const { data: row } = await admin.from('reward_redemptions')
    .select('fulfilment_data').eq('id', id).eq('status', 'pending').maybeSingle();
  const current = (row?.fulfilment_data ?? null) as { merch?: Stored } | null;
  if (!current?.merch) return { success: false, error: 'That order is no longer waiting.' };

  const reference = supplierReference?.trim().slice(0, 100) || current.merch.supplier_reference || null;
  const merch = { ...current.merch, state: 'ordered' as const, supplier_reference: reference, handled_by: user.id };

  const { data, error } = await admin.from('reward_redemptions')
    .update({ fulfilment_data: { ...current, merch }, ...(step === 'sent' ? { status: 'fulfilled' } : {}) })
    .eq('id', id).eq('status', 'pending').select('id');
  if (error || !data?.length) return { success: false, error: 'That order is no longer waiting.' };

  revalidatePath('/admin/merchandise');
  return { success: true, data: undefined };
}
