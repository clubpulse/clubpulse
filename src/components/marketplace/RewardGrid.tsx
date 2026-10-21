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
    return (
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0, fontFamily: "'Inter', sans-serif" }}>
        No rewards are available yet. Check back soon.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {categories.length > 2 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              style={{
                background: category === c ? '#9b1c1c' : 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '999px',
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 500,
                textTransform: 'capitalize',
                color: category === c ? '#fff' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '14px' }}>
        {visible.map((reward) => (
          <RewardCard key={reward.id} reward={reward} balance={balance} />
        ))}
      </div>
    </div>
  );
}
