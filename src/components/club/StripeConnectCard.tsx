'use client';

import { useState, useEffect } from 'react';
import { card, cardTitle, muted } from '@/components/play/ui';
import type { ClubStripeAccount } from '@/lib/types/subscription';

type Props = {
  clubId: string;
  stripeAccount: ClubStripeAccount | null;
};

export function StripeConnectCard({ clubId, stripeAccount }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(stripeAccount);

  const isComplete = status?.onboarding_complete;
  const chargesEnabled = status?.charges_enabled;

  async function handleConnect() {
    setLoading(true);
    try {
      const res = await fetch('/api/club/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: clubId }),
      });
      const data = await res.json();
      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
      }
    } catch (err) {
      console.error('Connect error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDashboard() {
    setLoading(true);
    try {
      const res = await fetch(`/api/club/stripe/connect?club_id=${clubId}`);
      const data = await res.json();
      if (data.dashboard_url) {
        window.open(data.dashboard_url, '_blank');
      }
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Refresh status on mount (in case redirected back from Stripe)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'complete') {
      fetch(`/api/club/stripe/connect?club_id=${clubId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.connected) {
            setStatus(data);
          }
        });
    }
  }, [clubId]);

  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div>
        <p style={cardTitle}>Stripe Connect</p>
        <p style={{ ...muted, marginTop: '2px' }}>
          Connect your club&apos;s Stripe account to accept payments and receive payouts.
        </p>
      </div>

      {/* Status indicators */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <StatusRow
          label="Account linked"
          done={!!status?.stripe_account_id}
        />
        <StatusRow
          label="Onboarding complete"
          done={!!isComplete}
        />
        <StatusRow
          label="Charges enabled"
          done={!!chargesEnabled}
        />
        <StatusRow
          label="Payouts enabled"
          done={!!status?.payouts_enabled}
        />
      </div>

      {/* Actions */}
      {!isComplete ? (
        <button
          onClick={handleConnect}
          disabled={loading}
          style={{
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            background: '#635BFF',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '-0.2px',
          }}
        >
          {loading
            ? 'Setting up...'
            : status?.stripe_account_id
              ? '🔄 Complete Stripe onboarding'
              : '🔗 Connect Stripe account'}
        </button>
      ) : (
        <button
          onClick={handleDashboard}
          disabled={loading}
          style={{
            padding: '10px',
            borderRadius: '10px',
            border: '1px solid rgba(99,91,255,0.3)',
            background: 'rgba(99,91,255,0.08)',
            color: '#A5A0FF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Loading...' : '↗ Open Stripe dashboard'}
        </button>
      )}
    </div>
  );
}

function StatusRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12.5px',
        color: done ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
      }}
    >
      <span
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          background: done ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
          color: done ? '#22C55E' : 'rgba(255,255,255,0.3)',
          flexShrink: 0,
        }}
      >
        {done ? '✓' : '○'}
      </span>
      {label}
    </div>
  );
}
