'use client';

import { useState } from 'react';
import {
  TIER_CONFIG,
  type SubscriptionTier,
  type ClubSubscription,
  formatPence,
  isSubscriptionActive,
} from '@/lib/types/subscription';
import { card, cardTitle, muted } from '@/components/play/ui';

type Props = {
  clubId: string;
  subscription: ClubSubscription | null;
};

export function SubscriptionCard({ clubId, subscription }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const currentTier = subscription?.tier ?? 'free';
  const isActive = subscription ? isSubscriptionActive(subscription) : true; // free is always active
  const config = TIER_CONFIG[currentTier];

  async function handleUpgrade(tier: SubscriptionTier, billingCycle: 'monthly' | 'annual') {
    setLoading(`${tier}-${billingCycle}`);
    try {
      const res = await fetch('/api/club/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: clubId, tier, billing_cycle: billingCycle }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.assign(data.checkout_url);
      }
    } catch (err) {
      console.error('Upgrade error:', err);
    } finally {
      setLoading(null);
    }
  }

  async function handleManageBilling() {
    setLoading('portal');
    try {
      const res = await fetch('/api/club/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: clubId }),
      });
      const data = await res.json();
      if (data.portal_url) {
        window.location.href = data.portal_url;
      }
    } catch (err) {
      console.error('Portal error:', err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <p style={cardTitle}>Your plan</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
          <span
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 800,
              fontSize: '28px',
              color: '#fff',
            }}
          >
            {config.label}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '6px',
              background: isActive
                ? 'rgba(34,197,94,0.15)'
                : 'rgba(239,68,68,0.15)',
              color: isActive ? '#22C55E' : '#EF4444',
            }}
          >
            {subscription?.status ?? 'active'}
          </span>
        </div>
        {subscription?.current_period_end && (
          <p style={{ ...muted, marginTop: '4px' }}>
            {subscription.cancel_at_period_end ? 'Cancels' : 'Renews'}{' '}
            {new Date(subscription.current_period_end).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
        {subscription?.trial_end && subscription.status === 'trialing' && (
          <p style={{ ...muted, marginTop: '4px' }}>
            Trial ends{' '}
            {new Date(subscription.trial_end).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        )}
      </div>

      {/* Current plan features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {config.features.map((f) => (
          <div key={f} style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.6)' }}>
            ✓ {f}
          </div>
        ))}
      </div>

      {/* Upgrade options */}
      {currentTier !== 'elite' && (
        <div>
          <p style={{ ...cardTitle, marginBottom: '10px' }}>Upgrade</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
            }}
          >
            {(Object.entries(TIER_CONFIG) as [SubscriptionTier, (typeof TIER_CONFIG)[SubscriptionTier]][])
              .filter(([t]) => {
                const tiers: SubscriptionTier[] = ['free', 'starter', 'pro', 'elite'];
                return tiers.indexOf(t) > tiers.indexOf(currentTier);
              })
              .map(([tier, cfg]) => (
                <div
                  key={tier}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '15px',
                      color: '#fff',
                    }}
                  >
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    {formatPence(cfg.monthlyPence)}/mo · {formatPence(cfg.annualPence)}/yr
                  </span>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <button
                      onClick={() => handleUpgrade(tier, 'monthly')}
                      disabled={loading !== null}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {loading === `${tier}-monthly` ? '...' : 'Monthly'}
                    </button>
                    <button
                      onClick={() => handleUpgrade(tier, 'annual')}
                      disabled={loading !== null}
                      style={{
                        flex: 1,
                        padding: '7px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#00C853',
                        color: '#0C1220',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {loading === `${tier}-annual` ? '...' : 'Annual (save 2mo)'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Manage billing */}
      {subscription?.stripe_customer_id && (
        <button
          onClick={handleManageBilling}
          disabled={loading === 'portal'}
          style={{
            padding: '10px',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          {loading === 'portal' ? 'Opening...' : '💳 Manage billing & invoices'}
        </button>
      )}
    </div>
  );
}
