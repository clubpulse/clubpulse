'use client';

import { useState } from 'react';
import { CVEditForm } from '@/components/cv/CVEditForm';
import { CricketCVCard } from '@/components/cv/CricketCVCard';
import type { FullCricketCV } from '@/lib/types/cricket-cv';

export function CVTabs({ cv }: { cv: FullCricketCV }) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [liveCv, setLiveCv] = useState(cv);

  const TAB_STYLE = (active: boolean) => ({
    padding: '7px 18px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    background: active ? '#1f2937' : 'transparent',
    color: active ? '#f9fafb' : '#6b7280',
    transition: 'background 0.15s, color 0.15s',
  });

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '20px',
          padding: '4px',
          background: '#0a0a0a',
          border: '1px solid #1f2937',
          borderRadius: '10px',
          width: 'fit-content',
        }}
      >
        <button style={TAB_STYLE(tab === 'edit')} onClick={() => setTab('edit')}>
          ✏️ Edit
        </button>
        <button style={TAB_STYLE(tab === 'preview')} onClick={() => setTab('preview')}>
          👁 Preview
        </button>
      </div>

      {tab === 'edit' && (
        <CVEditForm
          cv={liveCv}
          onSaved={() => {
            // Trigger a soft refresh of the preview by nudging state
            setLiveCv((c) => ({ ...c }));
          }}
        />
      )}

      {tab === 'preview' && (
        <div style={{ maxWidth: '680px' }}>
          <p style={{ marginBottom: '12px', fontSize: '12px', color: '#6b7280' }}>
            This is how your CV appears to anyone you share the link with.
          </p>
          <CricketCVCard cv={liveCv} isPreview />
        </div>
      )}
    </div>
  );
}
