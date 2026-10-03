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
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-end justify-between">
          <h1 className="text-2xl font-bold text-white">Marketplace</h1>
          <p className="text-sm text-neutral-400">You have <span className="font-semibold text-brand-gold">{formatScores(balance)} Scores</span></p>
        </div>
        {rewards.success ? (
          <RewardGrid rewards={rewards.data} balance={balance} />
        ) : (
          <p className="text-sm text-red-400">Couldn&apos;t load rewards: {rewards.error}</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Shop and earn Scores</h2>
        <p className="mb-4 text-sm text-neutral-400">Buy kit from our partners through these links and earn Scores on every order.</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SPORTS_MERCHANTS.map((merchant) => (
            <AwinMerchantCard key={merchant.id} merchant={merchant} userId={user.id} />
          ))}
        </div>
      </section>
    </div>
  );
}
