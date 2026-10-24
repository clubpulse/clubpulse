'use client';

import { useState, useTransition } from 'react';
import type { DressingRoomPost, PollOption } from '@/lib/types/dressing-room';
import { castVote } from '@/lib/actions/dressing-room';

interface PollCardProps {
  post: DressingRoomPost;
  currentUserId: string;
  onUpdate: (updated: DressingRoomPost) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function PollCard({ post, currentUserId, onUpdate }: PollCardProps) {
  const [isPending, startTransition] = useTransition();
  const options: PollOption[] = post.poll_options ?? [];
  const myVote = post.poll_votes?.[currentUserId];
  const hasVoted = Boolean(myVote);
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);

  function vote(optionId: string) {
    startTransition(async () => {
      const res = await castVote(post.id, optionId);
      if (res.success) onUpdate(res.data);
    });
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '14px',
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '16px' }}>📊</span>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: '13px',
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Poll
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" }}>
          {post.display_name ?? 'Admin'} · {formatDate(post.created_at)}
        </span>
      </div>

      <p style={{
        margin: '0 0 14px',
        fontSize: '15px',
        fontWeight: 600,
        color: '#fff',
        lineHeight: 1.4,
        fontFamily: "'Inter', sans-serif",
      }}>
        {post.body}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((opt) => {
          const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
          const isMyChoice = myVote === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={isPending}
              onClick={() => !hasVoted && vote(opt.id)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '10px',
                border: isMyChoice
                  ? '1px solid rgba(34,197,94,0.6)'
                  : '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                cursor: hasVoted ? 'default' : 'pointer',
                overflow: 'hidden',
                textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
            >
              {/* Fill bar */}
              {hasVoted && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${pct}%`,
                  background: isMyChoice ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                  transition: 'width 0.4s ease',
                  pointerEvents: 'none',
                }} />
              )}

              <span style={{
                position: 'relative',
                fontSize: '14px',
                color: '#fff',
                fontFamily: "'Inter', sans-serif",
                fontWeight: isMyChoice ? 600 : 400,
              }}>
                {isMyChoice && <span style={{ marginRight: '6px' }}>✓</span>}
                {opt.text}
              </span>

              {hasVoted && (
                <span style={{
                  position: 'relative',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isMyChoice ? '#4ade80' : 'rgba(255,255,255,0.45)',
                  fontFamily: "'Inter', sans-serif",
                  flexShrink: 0,
                  marginLeft: '8px',
                }}>
                  {pct}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {hasVoted && (
        <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" }}>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · tap again to change
        </p>
      )}
    </div>
  );
}
