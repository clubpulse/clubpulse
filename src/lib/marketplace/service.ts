import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/lib/types/action';
import type { RedemptionResult, Reward } from '@/lib/types/reward';

import { isUuid } from '@/lib/utils/validate';

export async function listActiveRewards(supabase: SupabaseClient): Promise<ActionResult<Reward[]>> {
  const { data, error } = await supabase
    .from('rewards_catalogue')
    .select('*')
    .eq('is_active', true)
    .order('creds_cost', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Reward[] };
}

export async function fetchReward(
  supabase: SupabaseClient,
  rewardId: string
): Promise<ActionResult<Reward>> {
  if (!isUuid(rewardId)) return { success: false, error: 'Reward not found' };

  const { data, error } = await supabase
    .from('rewards_catalogue')
    .select('*')
    .eq('id', rewardId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Reward not found' };
  return { success: true, data: data as Reward };
}

type RedeemRpcResult =
  | { ok: true; redemption_id: string; creds_spent: number; balance: number }
  | { ok: false; error: 'not_found' | 'out_of_stock'; }
  | { ok: false; error: 'insufficient_creds'; balance: number; cost: number };

// userId must already be verified by the caller. Deduction, stock and the redemption row are
// handled atomically by the redeem_reward SQL function (service role only).
export async function redeemRewardForUser(
  userId: string,
  rewardId: string
): Promise<ActionResult<RedemptionResult>> {
  if (!isUuid(rewardId)) return { success: false, error: 'Reward not found' };

  const { data, error } = await createAdminClient().rpc('redeem_reward', {
    p_user_id:   userId,
    p_reward_id: rewardId,
  });
  if (error) return { success: false, error: 'Could not complete redemption' };

  const result = data as RedeemRpcResult;
  if (!result.ok) {
    switch (result.error) {
      case 'not_found':
        return { success: false, error: 'Reward not found' };
      case 'out_of_stock':
        return { success: false, error: 'This reward is out of stock' };
      case 'insufficient_creds':
        return { success: false, error: `Not enough Scores. Need ${result.cost}, have ${result.balance}.` };
    }
  }

  return {
    success: true,
    data: {
      redemptionId: result.redemption_id,
      scoresSpent:   result.creds_spent,
      balance:      result.balance,
    },
  };
}
