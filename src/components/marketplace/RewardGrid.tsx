'use client';

import { useMemo, useState } from 'react';
import { RewardCard } from '@/components/marketplace/RewardCard';
import type { Reward } from '@/lib/types/reward';

export function RewardGrid({ rewards, balance }: { rewards: Reward[]; balance: number }) {
  const [category, setCategory] = useState<string>('all');

  const categories = useMemo(
    () => ['all', ...new Set(rewards.map((r) => r.category).filter((c): c is string => !!c))],
    [rewards]
  );
  const visible = category === 'all' ? rewards : rewards.filter((r) => r.category === category);

  if (rewards.length === 0) {
    return <p className="text-sm text-neutral-500">No rewards are available yet. Check back soon.</p>;
  }

  return (
    <div className="space-y-4">
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
                category === c ? 'bg-brand-primary text-white' : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((reward) => (
          <RewardCard key={reward.id} reward={reward} balance={balance} />
        ))}
      </div>
    </div>
  );
}
