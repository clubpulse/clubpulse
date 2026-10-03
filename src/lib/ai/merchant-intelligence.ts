import { createAdminClient } from '@/lib/supabase/admin';
import { MODEL_FAST, extractText, getAnthropic } from '@/lib/ai/client';
import {
  MIN_COHORT,
  type PeakWindow,
  type RedemptionInsight,
  type RoleBreakdown,
  type SpendPattern,
} from '@/lib/types/merchant';

const MAX_ROWS = 5000;

type Row = {
  user_id:     string;
  creds_spent: number;
  redeemed_at: string;
  reward:      { category: string | null; merchant_id: string | null } | { category: string | null; merchant_id: string | null }[] | null;
};

// Aggregated and anonymised: no user ids or names leave this function, and any bucket with fewer
// than MIN_COHORT redemptions is dropped so small groups can't be re-identified.
// merchantId limits it to that merchant's rewards; omit for platform-wide (service role only).
export async function getMerchantInsights(merchantId?: string): Promise<RedemptionInsight> {
  const admin = createAdminClient();

  let query = admin
    .from('reward_redemptions')
    .select('user_id, creds_spent, redeemed_at, reward:rewards_catalogue!inner ( category, merchant_id )')
    .order('redeemed_at', { ascending: false })
    .limit(MAX_ROWS);
  if (merchantId) query = query.eq('reward.merchant_id', merchantId);

  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];

  // Each user's primary role, for the role-based breakdown
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const roleByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: roles } = await admin
      .from('user_roles')
      .select('user_id, role, is_primary')
      .in('user_id', userIds)
      .order('is_primary', { ascending: false });
    for (const r of roles ?? []) if (!roleByUser.has(r.user_id)) roleByUser.set(r.user_id, r.role);
  }

  const categories = new Map<string, SpendPattern>();
  const windows = new Map<string, PeakWindow>();
  const roles = new Map<string, RoleBreakdown>();

  for (const row of rows) {
    const reward = Array.isArray(row.reward) ? row.reward[0] : row.reward;
    const category = reward?.category ?? 'uncategorised';
    const when = new Date(row.redeemed_at);

    const c = categories.get(category) ?? { category, redemptions: 0, creds_spent: 0 };
    c.redemptions += 1;
    c.creds_spent += row.creds_spent;
    categories.set(category, c);

    const key = `${when.getUTCDay()}-${when.getUTCHours()}`;
    const w = windows.get(key) ?? { dayOfWeek: when.getUTCDay(), hour: when.getUTCHours(), count: 0 };
    w.count += 1;
    windows.set(key, w);

    const role = roleByUser.get(row.user_id) ?? 'unknown';
    const r = roles.get(role) ?? { role, redemptions: 0 };
    r.redemptions += 1;
    roles.set(role, r);
  }

  const topCategories = [...categories.values()]
    .filter((c) => c.redemptions >= MIN_COHORT)
    .sort((a, b) => b.redemptions - a.redemptions)
    .slice(0, 8);
  const peakWindows = [...windows.values()]
    .filter((w) => w.count >= MIN_COHORT)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  const roleBreakdown = [...roles.values()]
    .filter((r) => r.redemptions >= MIN_COHORT)
    .sort((a, b) => b.redemptions - a.redemptions);

  const insight: RedemptionInsight = {
    totalRedemptions: rows.length,
    topCategories,
    peakWindows,
    roleBreakdown,
    summary: '',
  };

  if (topCategories.length === 0) {
    insight.summary = rows.length === 0
      ? 'No redemptions yet. Insights appear once there is enough activity.'
      : `Not enough activity yet: groups need at least ${MIN_COHORT} redemptions before they are shown.`;
    return insight;
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  try {
    const response = await getAnthropic().messages.create({
      model: MODEL_FAST,
      max_tokens: 250,
      messages: [{
        role: 'user',
        content: `Write ONE paragraph (max 80 words, British English) summarising these anonymised reward-redemption stats for a sports-club merchant. Be concrete about what sells, when, and to which groups. Do not invent numbers.

Total redemptions: ${insight.totalRedemptions}
Top categories: ${JSON.stringify(topCategories)}
Peak windows (UTC): ${JSON.stringify(peakWindows.map((w) => ({ day: days[w.dayOfWeek], hour: w.hour, count: w.count })))}
By role: ${JSON.stringify(roleBreakdown)}`,
      }],
    });
    insight.summary = extractText(response);
  } catch {
    const top = topCategories[0];
    insight.summary = `${top.category} is the most redeemed category (${top.redemptions} of ${insight.totalRedemptions} redemptions).`;
  }

  return insight;
}
