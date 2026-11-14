'use client';

import { useState } from 'react';

interface DebutCardProps {
  userId: string;
  displayName: string;
}

export function DebutCard({ userId, displayName }: DebutCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = `${window.location.origin}/api/debut-card/${userId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy your debut card link:', shareUrl);
    }
  }

  function handleDownload() {
    window.open(`/api/debut-card/${userId}`, '_blank');
  }

  return (
    <div
      style={{
        background: 'rgba(26, 51, 38, 0.6)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '16px',
        padding: '24px',
      }}
    >
      <h2
        style={{
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: '18px',
          fontWeight: 900,
          color: '#f59e0b',
          marginBottom: '4px',
          letterSpacing: '0.5px',
        }}
      >
        Your Debut Card
      </h2>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
        Share your ClubPulse player card with the world.
      </p>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/debut-card/${userId}`}
          alt={`${displayName}'s debut card`}
          width={200}
          height={280}
          style={{
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            border: '1px solid rgba(245,158,11,0.4)',
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleShare}
          style={{
            padding: '10px 20px',
            background: copied ? '#065f46' : '#f59e0b',
            color: copied ? '#6ee7b7' : '#0f2318',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.5px',
          }}
        >
          {copied ? '✓ Link copied!' : '🔗 Share card'}
        </button>
        <button
          onClick={handleDownload}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            color: '#f59e0b',
            border: '1px solid rgba(245,158,11,0.5)',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            letterSpacing: '0.5px',
          }}
        >
          ↗ Open full size
        </button>
      </div>
    </div>
  );
}
