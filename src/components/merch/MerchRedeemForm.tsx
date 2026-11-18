'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { input, muted } from '@/components/play/ui';
import { formatScores } from '@/lib/utils/format';
import type { Reward } from '@/lib/types/reward';

const label: React.CSSProperties = { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' };
const field: React.CSSProperties = { ...input, width: '100%', boxSizing: 'border-box' };

/** Redeem a physical item: pick a size if it has sizes, and say where to post it. UK only. */
export function MerchRedeemForm({ reward, balance }: { reward: Reward; balance: number }) {
  const router = useRouter();
  const sizes = reward.merch_sizes ?? [];
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [size, setSize] = useState('');
  const [form, setForm] = useState({ name: '', line1: '', line2: '', town: '', postcode: '' });

  const outOfStock = reward.stock_count !== null && reward.stock_count <= 0;
  const shortfall = reward.creds_cost - balance;
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/marketplace/redeem-merch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: reward.id, delivery: { ...form, size: size || undefined } }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? 'Could not place the order'); return; }
      setDone(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={outOfStock || shortfall > 0} className="w-full sm:w-auto">
        {outOfStock ? 'Out of stock' : shortfall > 0 ? `${formatScores(shortfall)} more Scores needed` : 'Order with Scores'}
      </Button>

      <Modal open={open} onClose={() => !loading && setOpen(false)} title={done ? 'Order placed' : `Order ${reward.title}`}>
        {done ? (
          <>
            <p className="text-sm text-neutral-300">
              Your <span className="font-semibold text-white">{reward.title}</span> is on order. It is made for you, so allow
              around two weeks for it to arrive at {form.postcode.toUpperCase()}.
            </p>
            <Button className="mt-6 w-full" onClick={() => router.push('/marketplace')}>Back to marketplace</Button>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p className="text-sm text-neutral-300">
              This costs <span className="font-semibold text-brand-gold">{formatScores(reward.creds_cost)} Scores</span>. You have{' '}
              {formatScores(balance)}, so you&apos;ll have {formatScores(balance - reward.creds_cost)} left. Postage is included.
            </p>

            {sizes.length > 0 && (
              <div>
                <label htmlFor="merch-size" style={label}>Size</label>
                <select id="merch-size" required value={size} onChange={(e) => setSize(e.target.value)} style={field}>
                  <option value="">Choose a size</option>
                  {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="merch-name" style={label}>Name on the parcel</label>
              <input id="merch-name" required maxLength={80} autoComplete="name" value={form.name} onChange={set('name')} style={field} />
            </div>
            <div>
              <label htmlFor="merch-line1" style={label}>Address line 1</label>
              <input id="merch-line1" required maxLength={100} autoComplete="address-line1" value={form.line1} onChange={set('line1')} style={field} />
            </div>
            <div>
              <label htmlFor="merch-line2" style={label}>Address line 2 (optional)</label>
              <input id="merch-line2" maxLength={100} autoComplete="address-line2" value={form.line2} onChange={set('line2')} style={field} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 2 }}>
                <label htmlFor="merch-town" style={label}>Town or city</label>
                <input id="merch-town" required maxLength={60} autoComplete="address-level2" value={form.town} onChange={set('town')} style={field} />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="merch-postcode" style={label}>Postcode</label>
                <input id="merch-postcode" required maxLength={8} autoComplete="postal-code" value={form.postcode} onChange={set('postcode')} style={field} />
              </div>
            </div>
            <p style={muted}>UK addresses only. We use this address to post your order and for nothing else.</p>

            <div className="mt-2 flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
              <Button type="submit" className="flex-1" loading={loading}>Place order</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
