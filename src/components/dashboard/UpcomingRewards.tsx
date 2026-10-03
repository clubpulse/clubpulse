import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { formatScores } from '@/lib/utils/format';
import type { Reward } from '@/lib/types/reward';

export const UPCOMING_WINDOW = 200;

// Rewards the user can't quite afford yet: within UPCOMING_WINDOW Scores of their balance
export function UpcomingRewards({ rewards, balance }: { rewards: Reward[]; balance: number }) {
  const upcoming = rewards
    .filter((r) => r.creds_cost > balance && r.creds_cost - balance <= UPCOMING_WINDOW)
    .slice(0, 3);

  return (
    <Card title="Upcoming rewards" description={`Within ${UPCOMING_WINDOW} Scores of your balance`}>
      {upcoming.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No rewards within reach yet.{' '}
          <Link href="/marketplace" className="text-brand-gold hover:underline">Browse the marketplace</Link>
        </p>
      ) : (
        <ul className="space-y-4">
          {upcoming.map((reward) => {
            const progress = Math.min(100, Math.round((balance / reward.creds_cost) * 100));
            return (
              <li key={reward.id}>
                <Link href={`/marketplace/${reward.id}`} className="block">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-white">{reward.title}</span>
                    <span className="shrink-0 text-xs text-neutral-400">{formatScores(reward.creds_cost - balance)} to go</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-800">
                    <div className="h-full rounded-full bg-brand-gold" style={{ width: `${progress}%` }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
