import { requireUser } from '@/lib/auth/server';
import { getUserRoles } from '@/lib/auth/admin';
import { createClient } from '@/lib/supabase/server';
import { fetchProfile, fetchWallet } from '@/lib/profile/service';
import { listActiveRewards } from '@/lib/marketplace/service';
import { getRecentActivity, getStreakInfo } from '@/lib/activity/service';
import { totalBalance } from '@/lib/types/scores';
import { WalletSummary } from '@/components/dashboard/WalletSummary';
import { StreakCard } from '@/components/dashboard/StreakCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { UpcomingRewards } from '@/components/dashboard/UpcomingRewards';
import { PredictiveScoresWidget } from '@/components/dashboard/PredictiveScoresWidget';
import { CheckInButton } from '@/components/volunteer/CheckInButton';

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [profile, wallet, streak, activity, rewards, roles] = await Promise.all([
    fetchProfile(supabase, user.id),
    fetchWallet(supabase, user.id),
    getStreakInfo(supabase, user.id),
    getRecentActivity(supabase, user.id, 5),
    listActiveRewards(supabase),
    getUserRoles(user.id),
  ]);

  const walletData = wallet.success ? wallet.data : null;
  const name = profile.success ? profile.data.display_name : user.email?.split('@')[0] ?? 'there';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Welcome back, {name}</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <WalletSummary flexi={walletData?.flexi_balance ?? 0} reward={walletData?.reward_balance ?? 0} />
          <PredictiveScoresWidget />
          <RecentActivity items={activity} />
        </div>
        <div className="space-y-6">
          <StreakCard info={streak} />
          <UpcomingRewards rewards={rewards.success ? rewards.data : []} balance={totalBalance(walletData)} />
          {roles.includes('volunteer') && <CheckInButton />}
        </div>
      </div>
    </div>
  );
}
