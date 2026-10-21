import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { fetchWallet } from '@/lib/profile/service';
import { listActiveRewards } from '@/lib/marketplace/service';
import { SPORTS_MERCHANTS } from '@/lib/awin';
import { totalBalance } from '@/lib/types/scores';
import { formatScores } from '@/lib/utils/format';
import { RewardGrid } from '@/components/marketplace/RewardGrid';
import { AwinMerchantCard } from '@/components/marketplace/AwinMerchantCard';

export default async function MarketplacePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [rewards, wallet] = await Promise.all([listActiveRewards(supabase), fetchWallet(supabase, user.id)]);
  const balance = totalBalance(wallet.success ? wallet.data : null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', fontFamily: "'Inter', sans-serif" }}>
      <section>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px' }}>
              Marketplace
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Redeem your Scores for rewards</p>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            You have{' '}
            <span style={{ fontWeight: 700, color: '#c9a54c' }}>{formatScores(balance)} Scores</span>
          </p>
        </div>
        {rewards.success ? (
          <RewardGrid rewards={rewards.data} balance={balance} />
        ) : (
          <p style={{ fontSize: '13px', color: '#f87171' }}>Couldn&apos;t load rewards: {rewards.error}</p>
        )}
      </section>

      {SPORTS_MERCHANTS.length > 0 && (
        <section>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 4px' }}>
            Shop and earn Scores
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', margin: '0 0 14px' }}>
            Buy kit from our partners through these links and earn Scores on every order.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {SPORTS_MERCHANTS.map((merchant) => (
              <AwinMerchantCard key={merchant.id} merchant={merchant} userId={user.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
