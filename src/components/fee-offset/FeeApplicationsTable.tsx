'use client';

import { useState, useTransition } from 'react';
import { approveApplication, rejectApplication } from '@/lib/actions/fee-offsets';
import type { FeeOffsetApplication } from '@/lib/types/fee-offsets';

interface Props {
  applications: FeeOffsetApplication[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', label: 'Pending' },
    approved: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', label: 'Approved' },
    rejected: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', label: 'Rejected' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{
      display: 'inline-block',
      background: s.bg,
      color: s.color,
      borderRadius: '6px',
      padding: '2px 10px',
      fontSize: '12px',
      fontWeight: 600,
    }}>
      {s.label}
    </span>
  );
}

function ApplicationRow({ app }: { app: FeeOffsetApplication }) {
  const [isPending, startTransition] = useTransition();
  const [rejectNotes, setRejectNotes] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [resolved, setResolved] = useState(app.status);
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    startTransition(async () => {
      const res = await approveApplication(app.id);
      if (res.success) setResolved('approved');
      else setError(res.error);
    });
  }

  function handleReject() {
    if (!rejectNotes.trim()) return;
    startTransition(async () => {
      const res = await rejectApplication(app.id, rejectNotes);
      if (res.success) {
        setResolved('rejected');
        setShowReject(false);
      } else {
        setError(res.error);
      }
    });
  }

  const appliedAt = new Date(app.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Applied {appliedAt}
            </p>
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
              {app.user_id.slice(0, 8)}…
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div>
              <p style={{ margin: '0 0 1px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scores</p>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#c9a54c', fontFamily: "'Syne', sans-serif" }}>
                {app.scores_applied.toLocaleString()}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 1px', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Discount</p>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#4ade80', fontFamily: "'Syne', sans-serif" }}>
                £{(app.pence_offset / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        <StatusBadge status={resolved} />
      </div>

      {resolved === 'pending' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <button
            onClick={handleApprove}
            disabled={isPending}
            style={{
              background: 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#4ade80',
              cursor: 'pointer',
              opacity: isPending ? 0.5 : 1,
            }}
          >
            Approve
          </button>
          {!showReject ? (
            <button
              onClick={() => setShowReject(true)}
              style={{
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.25)',
                borderRadius: '8px',
                padding: '7px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#f87171',
                cursor: 'pointer',
              }}
            >
              Reject
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                placeholder="Reason for rejection…"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                style={{
                  flex: 1,
                  background: '#1a1a1a',
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '13px',
                  color: '#fff',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleReject}
                disabled={isPending || !rejectNotes.trim()}
                style={{
                  background: 'rgba(248,113,113,0.15)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#f87171',
                  cursor: 'pointer',
                  opacity: !rejectNotes.trim() || isPending ? 0.5 : 1,
                }}
              >
                Confirm
              </button>
              <button
                onClick={() => setShowReject(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  padding: '7px',
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {app.admin_notes && resolved !== 'pending' && (
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>
          Note: {app.admin_notes}
        </p>
      )}

      {error && (
        <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{error}</p>
      )}
    </div>
  );
}

export function FeeApplicationsTable({ applications }: Props) {
  if (applications.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          No applications yet this season.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {applications.map((app) => (
        <ApplicationRow key={app.id} app={app} />
      ))}
    </div>
  );
}
