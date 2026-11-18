// Server-only. Redeems a merchandise reward for a signed-in member.

import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/lib/types/action';
import type { RedemptionResult } from '@/lib/types/reward';
import { isUuid } from '@/lib/utils/validate';
import { parseDelivery } from '@/lib/merch/logic';

type RpcResult =
  | { ok: true; redemption_id: string; creds_spent: number; balance: number }
  | { ok: false; error: 'not_found' | 'out_of_stock' | 'bad_size' }
  | { ok: false; error: 'insufficient_creds'; balance: number; cost: number };

/** userId must already be verified by the caller. */
export async function redeemMerchForUser(
  userId: string,
  rewardId: string,
  rawDelivery: unknown,
): Promise<ActionResult<RedemptionResult>> {
  if (!isUuid(rewardId)) return { success: false, error: 'Reward not found' };
  const admin = createAdminClient();

  const { data: reward } = await admin
    .from('rewards_catalogue')
    .select('is_active, is_merch, merch_sizes')
    .eq('id', rewardId)
    .maybeSingle();
  if (!reward || !reward.is_active || !reward.is_merch) return { success: false, error: 'Reward not found' };

  // A junior's parent or guardian orders for them: we do not take a delivery address from a child
  const { data: junior } = await admin
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_junior', true)
    .limit(1);
  if (junior && junior.length > 0) {
    return { success: false, error: 'Ask your parent or guardian to order this for you.' };
  }

  const parsed = parseDelivery(rawDelivery, (reward.merch_sizes as string[] | null) ?? []);
  if (!parsed.ok) return { success: false, error: parsed.error };

  const { data, error } = await admin.rpc('redeem_merch', {
    p_user_id: userId,
    p_reward_id: rewardId,
    p_delivery: parsed.value,
  });
  if (error) return { success: false, error: 'Could not place the order. No Scores were taken.' };

  const result = data as RpcResult;
  if (!result.ok) {
    switch (result.error) {
      case 'not_found': return { success: false, error: 'Reward not found' };
      case 'bad_size': return { success: false, error: 'Choose a size.' };
      case 'out_of_stock': return { success: false, error: 'This item is out of stock' };
      case 'insufficient_creds':
        return { success: false, error: `Not enough Scores. Need ${result.cost}, have ${result.balance}.` };
    }
  }
  return { success: true, data: { redemptionId: result.redemption_id, scoresSpent: result.creds_spent, balance: result.balance } };
}
