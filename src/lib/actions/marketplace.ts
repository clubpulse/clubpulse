'use server';

import { createClient } from '@/lib/supabase/server';
import { listActiveRewards, redeemRewardForUser } from '@/lib/marketplace/service';
import type { ActionResult } from '@/lib/types/action';
import type { RedemptionResult, Reward } from '@/lib/types/reward';

export async function getRewards(): Promise<ActionResult<Reward[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  return listActiveRewards(supabase);
}

// Deducts Creds, decrements stock and records the redemption atomically (redeem_reward RPC)
export async function redeemReward(rewardId: string): Promise<ActionResult<RedemptionResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  return redeemRewardForUser(user.id, rewardId);
}
