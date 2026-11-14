'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { ActionResult } from '@/lib/types/action';
import type { KitReward, KitRedemption, KitSupplier } from '@/lib/types/kit-discounts';

export async function getKitRewards(): Promise<ActionResult<KitReward[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('rewards_catalogue')
    .select('*, supplier:kit_suppliers(*)')
    .eq('category', 'kit')
    .eq('is_active', true)
    .order('creds_cost', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as KitReward[] };
}

export async function getMyKitRedemptions(userId: string): Promise<ActionResult<KitRedemption[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('reward_redemptions')
    .select(`
      *,
      reward:rewards_catalogue!reward_id(*)
    `)
    .eq('user_id', userId)
    .eq('rewards_catalogue.category', 'kit')
    .order('redeemed_at', { ascending: false });

  if (error) return { success: false, error: error.message };

  // Filter to only kit redemptions (join may not filter server-side with eq on related table)
  const kitRedemptions = ((data ?? []) as KitRedemption[]).filter(
    (r) => r.reward?.category === 'kit'
  );

  return { success: true, data: kitRedemptions };
}

export async function redeemKitReward(rewardId: string): Promise<ActionResult<{ redemptionId: string; scoresSpent: number; voucherCode?: string }>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('redeem_reward', {
    p_user_id: user.id,
    p_reward_id: rewardId,
  });

  if (error) return { success: false, error: error.message };

  // Fetch the voucher code if one exists on this reward
  const { data: reward } = await supabase
    .from('rewards_catalogue')
    .select('voucher_code')
    .eq('id', rewardId)
    .single();

  return {
    success: true,
    data: {
      redemptionId: (data as { redemption_id?: string })?.redemption_id ?? '',
      scoresSpent: (data as { creds_spent?: number })?.creds_spent ?? 0,
      voucherCode: reward?.voucher_code ?? undefined,
    },
  };
}

export async function getMyCredsBalance(userId: string): Promise<ActionResult<{ flexi_balance: number; reward_balance: number; total: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('creds_wallet')
    .select('flexi_balance, reward_balance')
    .eq('user_id', userId)
    .single();

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: {
      flexi_balance: data.flexi_balance ?? 0,
      reward_balance: data.reward_balance ?? 0,
      total: (data.flexi_balance ?? 0) + (data.reward_balance ?? 0),
    },
  };
}

export async function getKitSuppliers(): Promise<ActionResult<KitSupplier[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('kit_suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as KitSupplier[] };
}
