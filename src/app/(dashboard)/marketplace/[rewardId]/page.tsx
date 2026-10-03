import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { fetchWallet } from '@/lib/profile/service';
import { fetchReward } from '@/lib/marketplace/service';
import { totalBalance } from '@/lib/types/scores';
import { formatScores } from '@/lib/utils/format';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { RedemptionModal } from '@/components/marketplace/RedemptionModal';

export default async function RewardPage({ params }: { params: Promise<{ rewardId: string }> }) {
  const { rewardId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [reward, wallet] = await Promise.all([fetchReward(supabase, rewardId), fetchWallet(supabase, user.id)]);
  if (!reward.success) notFound();

  const r = reward.data;
  const balance = totalBalance(wallet.success ? wallet.data : null);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/marketplace" className="text-sm text-neutral-400 hover:text-white">← Marketplace</Link>
      <Card>
        {r.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.image_url} alt="" className="mb-5 aspect-video w-full rounded-xl object-cover" />
        )}
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">{r.title}</h1>
          {r.category && <Badge>{r.category}</Badge>}
        </div>
        {r.description && <p className="mt-3 text-neutral-300">{r.description}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-3xl font-bold tabular-nums text-brand-gold">{formatScores(r.creds_cost)} Scores</p>
            <p className="text-xs text-neutral-500">
              You have {formatScores(balance)}
              {r.stock_count !== null && ` · ${r.stock_count} left`}
            </p>
          </div>
          <RedemptionModal reward={r} balance={balance} />
        </div>
      </Card>
    </div>
  );
}
