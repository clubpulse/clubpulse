'use client';

import { useState, useTransition } from 'react';
import { voteForNomination } from '@/lib/actions/infamy';
import type { InfamyNomination } from '@/lib/types/infamy';

interface NominationCardProps {
  nomination: InfamyNomination;
  currentUserId: string;
  clubId: string;
  hasVoted: boolean;
  onVoted?: (nominationId: string) => void;
}

export function NominationCard({
  nomination,
  currentUserId,
  clubId,
  hasVoted,
  onVoted,
}: NominationCardProps) {
  const [voted, setVoted] = useState(hasVoted);
  const [voteCount, setVoteCount] = useState(nomination.vote_count ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isSelf = nomination.nominated_user_id === currentUserId;
  const displayName = nomination.nominated_profile?.full_name ?? 'Unknown player';

  function handleVote() {
    if (voted || isSelf || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await voteForNomination(nomination.id, clubId);
      if (result.success) {
        setVoted(true);
        setVoteCount((c) => c + 1);
        onVoted?.(nomination.id);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(220,38,38,0.2)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(220,38,38,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            {nomination.nominated_profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={nomination.nominated_profile.avatar_url}
                alt={displayName}
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              '👤'
            )}
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontWeight: 700,
                fontSize: '15px',
                color: '#fff',
              }}
            >
              {displayName}
              {isSelf && (
                <span
                  style={{
                    marginLeft: '6px',
                    fontSize: '11px',
                    color: 'rgba(220,38,38,0.8)',
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                  }}
                >
                  (you)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Vote button / count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '13px',
              color: voted ? 'rgba(220,38,38,0.9)' : 'rgba(255,255,255,0.45)',
              fontWeight: 600,
            }}
          >
            {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
          </span>
          {!isSelf && (
            <button
              onClick={handleVote}
              disabled={voted || isPending}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                cursor: voted || isPending ? 'not-allowed' : 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontSize: '13px',
                fontWeight: 600,
                background: voted
                  ? 'rgba(220,38,38,0.15)'
                  : 'rgba(220,38,38,0.75)',
                color: voted ? 'rgba(220,38,38,0.6)' : '#fff',
                transition: 'all 0.15s',
                opacity: isPending ? 0.6 : 1,
              }}
            >
              {voted ? '✓ Voted' : isPending ? '…' : 'Vote'}
            </button>
          )}
        </div>
      </div>

      {/* Reason */}
      <p
        style={{
          margin: 0,
          fontFamily: "'Inter', sans-serif",
          fontSize: '13px',
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.5,
          fontStyle: 'italic',
        }}
      >
        &ldquo;{nomination.reason}&rdquo;
      </p>

      {error && (
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: 'rgba(220,38,38,0.8)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
