'use client';

import { useTransition, useState } from 'react';
import { generateClubBible } from '@/lib/actions/club-bible';

interface Props {
  clubId: string;
  generationCount: number;
}

export function GenerateBibleButton({ clubId, generationCount }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await generateClubBible(clubId);
      if (!result.success) setError(result.error);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        onClick={handleClick}
        disabled={isPending}
        style={{
          background: isPending ? 'rgba(155,28,28,0.4)' : 'linear-gradient(135deg, #9b1c1c 0%, #7f1d1d 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: isPending ? 'not-allowed' : 'pointer',
          fontFamily: "'Inter', sans-serif",
          transition: 'opacity 0.15s',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span aria-hidden>✨</span>
        {isPending ? 'Generating…' : generationCount === 0 ? 'Generate Club Bible' : 'Regenerate Club Bible'}
      </button>
      {error && (
        <p style={{ fontSize: '12px', color: '#f87171', margin: 0, fontFamily: "'Inter', sans-serif" }}>{error}</p>
      )}
      {generationCount > 0 && !isPending && (
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0, fontFamily: "'Inter', sans-serif" }}>
          Generated {generationCount} time{generationCount !== 1 ? 's' : ''} total
        </p>
      )}
    </div>
  );
}
