import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { formatScores } from '@/lib/utils/format';
import type { Reward } from '@/lib/types/reward';

export function RewardCard({ reward, balance }: { reward: Reward; balance: number }) {
  const outOfStock = reward.stock_count !== null && reward.stock_count <= 0;
  const affordable = balance >= reward.creds_cost;

  return (
    <Link
      href={`/marketplace/${reward.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 transition hover:border-neutral-600"
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-neutral-900">
        {reward.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reward.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="text-4xl" aria-hidden>🎁</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-white group-hover:text-brand-gold">{reward.title}</h3>
          {reward.category && <Badge>{reward.category}</Badge>}
        </div>
        {reward.description && <p className="line-clamp-2 text-sm text-neutral-400">{reward.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold tabular-nums text-brand-gold">{formatScores(reward.creds_cost)} Scores</span>
          {outOfStock ? <Badge tone="red">Out of stock</Badge> : affordable ? <Badge tone="green">You can afford this</Badge> : null}
        </div>
      </div>
    </Link>
  );
}
