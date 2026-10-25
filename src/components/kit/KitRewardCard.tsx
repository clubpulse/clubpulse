'use client';

import { useState, useTransition } from 'react';
import { redeemKitReward } from '@/lib/actions/kit-discounts';
import { formatScores } from '@/lib/utils/format';
import type { KitReward } from '@/lib/types/kit-discounts';

interface KitRewardCardProps {
  reward: KitReward;
  balance: number;
}

export function KitRewardCard({ reward, balance }: KitRewardCardProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ voucherCode?: string; error?: string } | null>(null);
  const [redeemed, setRedeemed] = useState(false);

  const outOfStock = reward.stock_count !== null && reward.stock_count !== undefined && reward.stock_count <= 0;
  const canAfford = balance >= reward.creds_cost;
  const shortfall = reward.creds_cost - balance;

  function handleRedeem() {
    startTransition(async () => {
      const res = await redeemKitReward(reward.id);
      if (res.success) {
        setRedeemed(true);
        setResult({ voucherCode: res.data.voucherCode });
      } else {
        setResult({ error: res.error });
      }
    });
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.07)',
      background: '#0f0f0f',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
    }}>
      {/* Discount badge */}
      {reward.discount_percent && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: '#9b1c1c',
          color: '#fff',
          borderRadius: '8px',
          padding: '3px 9px',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.3px',
          zIndex: 1,
        }}>
          {reward.discount_percent}% OFF
        </div>
      )}

      {/* Card body */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '18px', flex: 1 }}>
        {/* Supplier / brand */}
        {(reward.supplier?.name || reward.brand) && (
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.35)' }}>
            {reward.supplier?.name ?? reward.brand}
          </p>
        )}

        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
          {reward.title}
        </h3>

        {reward.description && (
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
            {reward.description}
          </p>
        )}

        {reward.min_order_value && (
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            Min. order: £{(reward.min_order_value / 100).toFixed(2)}
          </p>
        )}

        {reward.expires_at && (
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            Expires: {new Date(reward.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}

        {/* Cost row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto', paddingTop: '8px' }}>
          <span aria-hidden style={{ fontSize: '14px' }}>💰</span>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#c9a54c', fontVariantNumeric: 'tabular-nums' }}>
            {formatScores(reward.creds_cost)} Scores
          </span>
        </div>

        {/* Post-redemption voucher */}
        {redeemed && result && !result.error && (
          <div style={{
            marginTop: '10px',
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(52,211,153,0.08)',
            border: '1px solid rgba(52,211,153,0.25)',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 600, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ✓ Redeemed!
            </p>
            {result.voucherCode ? (
              <>
                <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Your voucher code:</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#fff', letterSpacing: '1.5px', fontFamily: 'monospace' }}>
                  {result.voucherCode}
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
                Contact admin to claim your discount.
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {result?.error && (
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#f87171' }}>
            {result.error}
          </p>
        )}

        {/* CTA */}
        {!redeemed && (
          <button
            onClick={handleRedeem}
            disabled={isPending || !canAfford || outOfStock}
            style={{
              marginTop: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              border: 'none',
              cursor: isPending || !canAfford || outOfStock ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '13px',
              fontFamily: "'Inter', sans-serif",
              transition: 'background 0.15s, opacity 0.15s',
              background: canAfford && !outOfStock ? '#9b1c1c' : 'rgba(255,255,255,0.07)',
              color: canAfford && !outOfStock ? '#fff' : 'rgba(255,255,255,0.35)',
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending
              ? 'Redeeming…'
              : outOfStock
              ? 'Out of stock'
              : canAfford
              ? `Redeem for ${formatScores(reward.creds_cost)} Scores`
              : `Need ${formatScores(shortfall)} more Scores`}
          </button>
        )}
      </div>
    </div>
  );
}
