'use client';

import { useState } from 'react';
import { saveHealthSnapshot } from '@/lib/actions/club-health';

interface Props {
  clubId: string;
}

export function SaveSnapshotButton({ clubId }: Props) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function handleSave() {
    setState('saving');
    const result = await saveHealthSnapshot(clubId);
    if (result.success) {
      setState('saved');
      setTimeout(() => setState('idle'), 3000);
    } else {
      setState('error');
      setTimeout(() => setState('idle'), 4000);
    }
  }

  const label =
    state === 'saving' ? 'Saving…'
    : state === 'saved' ? '✓ Snapshot saved'
    : state === 'error' ? 'Error — retry'
    : 'Save snapshot';

  const bg =
    state === 'saved' ? 'rgba(52,211,153,0.15)'
    : state === 'error' ? 'rgba(248,113,113,0.15)'
    : '#c9a54c';

  return (
    <button
      onClick={handleSave}
      disabled={state === 'saving'}
      style={{
        background: bg,
        border: 'none',
        borderRadius: '10px',
        padding: '8px 16px',
        color: state === 'idle' ? '#0B0B0B' : '#fff',
        fontSize: '13px',
        fontWeight: 600,
        cursor: state === 'saving' ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
        opacity: state === 'saving' ? 0.7 : 1,
      }}
    >
      {label}
    </button>
  );
}
