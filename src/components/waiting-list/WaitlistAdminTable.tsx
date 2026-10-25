'use client';

import { useState } from 'react';
import { approveEntry, declineEntry } from '@/lib/actions/waiting-list';
import type { WaitingListEntry } from '@/lib/types/waiting-list';

interface WaitlistAdminTableProps {
  entries: WaitingListEntry[];
}

export function WaitlistAdminTable({ entries: initial }: WaitlistAdminTableProps) {
  const [entries, setEntries] = useState(initial);
  const [processing, setProcessing] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; message: string; ok: boolean } | null>(null);

  async function handleApprove(id: string) {
    setProcessing(id);
    const result = await approveEntry(id);
    setProcessing(null);
    if (result.success) {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'approved', joining_bonus_awarded: result.data.joining_bonus } : e))
      );
      setFlash({ id, message: `Approved — +${result.data.joining_bonus} Scores joining bonus sent`, ok: true });
    } else {
      setFlash({ id, message: result.error, ok: false });
    }
    setTimeout(() => setFlash(null), 4000);
  }

  async function handleDecline(id: string) {
    setProcessing(id);
    const result = await declineEntry(id);
    setProcessing(null);
    if (result.success) {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'declined' } : e))
      );
    } else {
      setFlash({ id, message: result.error, ok: false });
      setTimeout(() => setFlash(null), 4000);
    }
  }

  const statusColor: Record<string, string> = {
    waiting: '#fbbf24',
    approved: '#4ade80',
    declined: '#f87171',
    withdrawn: 'rgba(255,255,255,0.3)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {flash && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 500,
          background: flash.ok ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${flash.ok ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
          color: flash.ok ? '#4ade80' : '#f87171',
        }}>
          {flash.message}
        </div>
      )}

      {entries.map((entry) => (
        <div key={entry.id} style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          padding: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          flexWrap: 'wrap',
        }}>
          {/* Queue number */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '16px',
            color: 'rgba(255,255,255,0.4)',
            flexShrink: 0,
          }}>
            #{entry.position_in_queue}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: '180px' }}>
            <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#fff', margin: '0 0 2px' }}>
              {entry.full_name}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 6px' }}>
              {entry.email}
              {entry.phone && <> · {entry.phone}</>}
            </p>
            {entry.cricket_background && (
              <p style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.55)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                padding: '6px 10px',
                margin: '0 0 6px',
                lineHeight: 1.5,
              }}>
                {entry.cricket_background}
              </p>
            )}
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
              Applied {new Date(entry.applied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          {/* Status + actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: statusColor[entry.status] ?? '#fff',
              background: `${statusColor[entry.status] ?? '#fff'}18`,
              border: `1px solid ${statusColor[entry.status] ?? '#fff'}33`,
              borderRadius: '8px',
              padding: '4px 10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {entry.status}
            </span>

            {entry.status === 'waiting' && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleApprove(entry.id)}
                  disabled={processing === entry.id}
                  style={{
                    background: 'rgba(74,222,128,0.12)',
                    border: '1px solid rgba(74,222,128,0.25)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#4ade80',
                    cursor: processing === entry.id ? 'not-allowed' : 'pointer',
                    opacity: processing === entry.id ? 0.5 : 1,
                  }}
                >
                  {processing === entry.id ? '…' : 'Approve'}
                </button>
                <button
                  onClick={() => handleDecline(entry.id)}
                  disabled={processing === entry.id}
                  style={{
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#f87171',
                    cursor: processing === entry.id ? 'not-allowed' : 'pointer',
                    opacity: processing === entry.id ? 0.5 : 1,
                  }}
                >
                  Decline
                </button>
              </div>
            )}

            {entry.status === 'approved' && entry.joining_bonus_awarded > 0 && (
              <span style={{ fontSize: '12px', color: '#4ade80' }}>
                +{entry.joining_bonus_awarded} Scores sent
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
