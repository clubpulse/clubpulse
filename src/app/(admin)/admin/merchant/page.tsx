import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { isMerchant, isPlatformAdmin } from '@/lib/auth/admin';
import { getMerchantInsights } from '@/lib/ai/merchant-intelligence';
import { Card } from '@/components/ui/Card';
import { SpendPatternChart } from '@/components/merchant/SpendPatternChart';
import { RedemptionHeatmap } from '@/components/merchant/RedemptionHeatmap';
import { MIN_COHORT } from '@/lib/types/merchant';

export default async function MerchantPage() {
  const user = await requireUser();
  const platformAdmin = isPlatformAdmin(user.id);
  if (!platformAdmin && !(await isMerchant(user.id))) redirect('/dashboard');

  // Merchants see only their own rewards; platform admins see everything
  const insights = await getMerchantInsights(platformAdmin ? undefined : user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Merchant insights</h1>
        <p className="text-sm text-neutral-400">
          Anonymised and aggregated. Groups with fewer than {MIN_COHORT} redemptions are hidden to protect privacy.
        </p>
      </div>

      <Card title="Summary" action={<span className="text-sm text-neutral-500">{insights.totalRedemptions} redemptions</span>}>
        <p className="text-neutral-200">{insights.summary}</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Top categories"><SpendPatternChart patterns={insights.topCategories} /></Card>
        <Card title="By role">
          {insights.roleBreakdown.length === 0 ? (
            <p className="text-sm text-neutral-500">Not enough data to show roles yet.</p>
          ) : (
            <ul className="space-y-2">
              {insights.roleBreakdown.map((r) => (
                <li key={r.role} className="flex justify-between text-sm">
                  <span className="capitalize text-white">{r.role.replace(/_/g, ' ')}</span>
                  <span className="tabular-nums text-neutral-400">{r.redemptions}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Peak redemption times"><RedemptionHeatmap windows={insights.peakWindows} /></Card>
    </div>
  );
}
