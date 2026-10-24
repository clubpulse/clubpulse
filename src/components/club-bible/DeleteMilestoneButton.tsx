'use client';

import { useTransition } from 'react';
import { deleteMilestone } from '@/lib/actions/club-bible';

interface Props {
  milestoneId: string;
}

export function DeleteMilestoneButton({ milestoneId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Delete this milestone?')) return;
    startTransition(async () => {
      await deleteMilestone(milestoneId);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label="Delete milestone"
      style={{
        background: 'transparent',
        border: '1px solid rgba(248,113,113,0.25)',
        borderRadius: '7px',
        color: '#f87171',
        fontSize: '11px',
        padding: '3px 10px',
        cursor: isPending ? 'not-allowed' : 'pointer',
        fontFamily: "'Inter', sans-serif",
        opacity: isPending ? 0.5 : 1,
        transition: 'opacity 0.15s, border-color 0.15s',
        flexShrink: 0,
      }}
    >
      {isPending ? '…' : 'Delete'}
    </button>
  );
}
