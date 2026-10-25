'use client';

import { useState, useTransition } from 'react';
import { acknowledgeDocument } from '@/lib/actions/documents';

interface Props {
  documentId: string;
  initialAcknowledgedAt?: string | null;
}

export function AcknowledgeButton({ documentId, initialAcknowledgedAt }: Props) {
  const [ackedAt, setAckedAt] = useState<string | null>(initialAcknowledgedAt ?? null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (ackedAt) {
    const date = new Date(ackedAt).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '8px',
        background: 'rgba(34,197,94,0.15)',
        border: '1px solid rgba(34,197,94,0.3)',
        fontSize: '12px',
        color: '#4ade80',
        fontFamily: "'Inter', sans-serif",
        fontWeight: 500,
      }}>
        ✓ Read on {date}
      </div>
    );
  }

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await acknowledgeDocument(documentId);
      if (result.success) {
        setAckedAt(result.data.acknowledged_at);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
      <button
        onClick={handleClick}
        disabled={isPending}
        style={{
          padding: '7px 16px',
          borderRadius: '8px',
          border: '1px solid rgba(155,28,28,0.6)',
          background: isPending ? 'rgba(155,28,28,0.1)' : 'rgba(155,28,28,0.2)',
          color: isPending ? 'rgba(255,255,255,0.4)' : '#fff',
          fontSize: '12px',
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          cursor: isPending ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {isPending ? 'Saving…' : '✓ I have read this document'}
      </button>
      {error && (
        <span style={{ fontSize: '11px', color: '#f87171', fontFamily: "'Inter', sans-serif" }}>
          {error}
        </span>
      )}
    </div>
  );
}
