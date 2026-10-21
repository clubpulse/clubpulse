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
import { PerformanceInsights } from '@/components/dashboard/PerformanceInsights';
import { EarningNudges } from '@/components/dashboard/EarningNudges';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h1 style={{
        fontFamily: "'Syne', sans-serif",
        fontWeight: 800, fontSize: '26px',
        color: '#fff', margin: 0, letterSpacing: '-0.3px',
      }}>
        Welcome back, {name} 👋
      </h1>

      {/* AI earning nudges — shown when relevant */}
      <EarningNudges />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="lg:grid-cols-3-auto">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left column — main */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: 'span 2' }} className="lg:col-span-2">
            <WalletSummary flexi={walletData?.flexi_balance ?? 0} reward={walletData?.reward_balance ?? 0} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ gridColumn: 'span 2' }} className="md:col-span-1">
                <PredictiveScoresWidget />
              </div>
              <div style={{ gridColumn: 'span 2' }} className="md:col-span-1">
                <PerformanceInsights />
              </div>
            </div>
            <RecentActivity items={activity} />
          </div>

          {/* Right column — sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', gridColumn: 'span 2' }} className="lg:col-span-1">
            <StreakCard info={streak} />
            <UpcomingRewards rewards={rewards.success ? rewards.data : []} balance={totalBalance(walletData)} />
            {roles.includes('volunteer') && <CheckInButton />}
          </div>
        </div>
      </div>
    </div>
  );
}
