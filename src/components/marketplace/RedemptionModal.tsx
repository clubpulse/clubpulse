'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatScores } from '@/lib/utils/format';
import type { Reward } from '@/lib/types/reward';

export function RedemptionModal({ reward, balance }: { reward: Reward; balance: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const outOfStock = reward.stock_count !== null && reward.stock_count <= 0;
  const shortfall = reward.creds_cost - balance;

  async function redeem() {
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: reward.id }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error ?? 'Could not redeem this reward');
        return;
      }
      setDone(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={outOfStock || shortfall > 0} className="w-full sm:w-auto">
        {outOfStock ? 'Out of stock' : shortfall > 0 ? `${formatScores(shortfall)} more Scores needed` : 'Redeem'}
      </Button>

      <Modal open={open} onClose={() => !loading && setOpen(false)} title={done ? 'Redeemed!' : 'Confirm redemption'}>
        {done ? (
          <>
            <p className="text-sm text-neutral-300">
              You&apos;ve redeemed <span className="font-semibold text-white">{reward.title}</span>. We&apos;ll be in touch with
              fulfilment details.
            </p>
            <Button className="mt-6 w-full" onClick={() => router.push('/marketplace')}>Back to marketplace</Button>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-300">
              Spend <span className="font-semibold text-brand-gold">{formatScores(reward.creds_cost)} Scores</span> on{' '}
              <span className="font-semibold text-white">{reward.title}</span>? You have {formatScores(balance)}, so you&apos;ll
              have {formatScores(balance - reward.creds_cost)} left.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
              <Button className="flex-1" onClick={redeem} loading={loading}>Confirm</Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
