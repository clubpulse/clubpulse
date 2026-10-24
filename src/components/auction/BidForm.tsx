'use client';

import { useState, useTransition } from 'react';
import { placeBid } from '@/lib/actions/auction';

interface BidFormProps {
  lotId: string;
  minBid: number;
  balance: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BidForm({ lotId, minBid, balance, onSuccess, onCancel }: BidFormProps) {
  const [amount, setAmount] = useState(minBid);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount < minBid) {
      setError(`Minimum bid is ${minBid} Scores`);
      return;
    }
    if (amount > balance) {
      setError(`Not enough Scores — you have ${balance}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await placeBid(lotId, amount);
      if (!res.success) {
        const msg: Record<string, string> = {
          bid_too_low: `Bid too low — minimum is ${(res as { data?: { minimum?: number } }).data?.minimum ?? minBid}`,
          insufficient_balance: `Not enough Scores — you have ${balance}`,
          auction_not_open: 'This auction is not open for bidding',
          bidding_closed: 'Bidding has closed',
          lot_not_available: 'This lot is no longer available',
          cannot_bid_on_self: "You can't bid on yourself",
        };
        setError(msg[res.error] ?? res.error);
      } else {
        onSuccess?.();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
        Your balance: <strong style={{ color: '#c9a54c' }}>{balance} Scores</strong>
      </p>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="number"
          min={minBid}
          max={balance}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          disabled={isPending}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            padding: '7px 10px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#fff',
            outline: 'none',
            fontFamily: "'Inter', sans-serif",
          }}
        />
        <button
          type="submit"
          disabled={isPending || amount > balance}
          style={{
            padding: '7px 16px',
            borderRadius: '8px',
            border: 'none',
            background: amount > balance ? 'rgba(255,255,255,0.06)' : '#9b1c1c',
            color: amount > balance ? 'rgba(255,255,255,0.3)' : '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isPending || amount > balance ? 'not-allowed' : 'pointer',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {isPending ? '…' : 'Bid'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: '11px', color: '#f87171' }}>{error}</p>
      )}
    </form>
  );
}
