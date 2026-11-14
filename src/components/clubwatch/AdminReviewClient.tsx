'use client';

import { useState, useTransition } from 'react';

type Report = {
  id: string;
  user_id: string;
  category: string;
  note: string;
  photo_url: string | null;
  status: 'pending' | 'verified' | 'rejected';
  scores_awarded: number;
  created_at: string;
  reporter_name: string;
  category_label: string;
  category_icon: string;
  category_scores: number;
};

type Props = {
  reports: Report[];
};

const statusStyles: Record<string, { bg: string; color: string; label: string }> = {
  verified: { bg: 'rgba(52,211,153,0.12)', color: '#34D399', label: '✅ Verified' },
  pending:  { bg: 'rgba(201,168,76,0.12)', color: '#C9A84C', label: '⏳ Pending' },
  rejected: { bg: 'rgba(248,113,113,0.12)', color: '#F87171', label: '❌ Rejected' },
};

export function AdminReviewClient({ reports: initialReports }: Props) {
  const [reports, setReports] = useState(initialReports);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  const handleReview = async (reportId: string, action: 'verify' | 'reject') => {
    setProcessing(reportId);
    setMessage('');
    try {
      const res = await fetch('/api/clubwatch/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Review failed');

      // Update local state
      setReports(prev => prev.map(r =>
        r.id === reportId
          ? { ...r, status: action === 'verify' ? 'verified' as const : 'rejected' as const, scores_awarded: data.scoresAwarded ?? 0 }
          : r
      ));
      setMessage(action === 'verify'
        ? `✅ Report verified — ${data.scoresAwarded} Scores awarded`
        : '❌ Report rejected'
      );
      setTimeout(() => setMessage(''), 3000);
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {([
          { key: 'all' as const, label: 'Total', value: reports.length, color: '#fff' },
          { key: 'pending' as const, label: 'Pending', value: pendingCount, color: '#C9A84C' },
          { key: 'verified' as const, label: 'Verified', value: reports.filter(r => r.status === 'verified').length, color: '#34D399' },
          { key: 'rejected' as const, label: 'Rejected', value: reports.filter(r => r.status === 'rejected').length, color: '#F87171' },
        ]).map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            style={{
              background: filter === s.key ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${filter === s.key ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '12px', padding: '14px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{s.label}</div>
          </button>
        ))}
      </div>

      {message && (
        <div style={{
          background: message.startsWith('Error') ? 'rgba(248,113,113,0.1)' : 'rgba(52,211,153,0.1)',
          border: `1px solid ${message.startsWith('Error') ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.3)'}`,
          borderRadius: '10px', padding: '10px 14px',
          fontSize: '13px', color: message.startsWith('Error') ? '#F87171' : '#34D399',
        }}>{message}</div>
      )}

      {/* Report list */}
      {filtered.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px', padding: '32px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>
            {filter === 'pending' ? '🎉' : '📋'}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
            {filter === 'pending' ? 'No pending reports — all caught up!' : `No ${filter} reports`}
          </div>
        </div>
      ) : (
        filtered.map(r => {
          const st = statusStyles[r.status] ?? statusStyles.pending;
          const isPending = r.status === 'pending';
          const isProcessing = processing === r.id;

          return (
            <div key={r.id} style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${isPending ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: '14px', padding: '16px',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{r.category_icon}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{r.category_label}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                      by {r.reporter_name} · {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <span style={{
                  background: st.bg, color: st.color,
                  fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '8px',
                }}>{st.label}</span>
              </div>

              {/* Note */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px',
                fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5',
              }}>
                {r.note}
              </div>

              {/* Actions for pending */}
              {isPending && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleReview(r.id, 'verify')}
                    disabled={isProcessing}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                      background: '#34D399', color: '#0B0B0B',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      opacity: isProcessing ? 0.5 : 1,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {isProcessing ? '…' : `✅ Verify (+${r.category_scores} Scores)`}
                  </button>
                  <button
                    onClick={() => handleReview(r.id, 'reject')}
                    disabled={isProcessing}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                      background: 'rgba(248,113,113,0.15)', color: '#F87171',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                      opacity: isProcessing ? 0.5 : 1,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {isProcessing ? '…' : '❌ Reject'}
                  </button>
                </div>
              )}

              {/* Scores if verified */}
              {r.status === 'verified' && r.scores_awarded > 0 && (
                <div style={{ fontSize: '12px', color: '#C9A84C', fontWeight: 700 }}>
                  +{r.scores_awarded} Scores awarded to {r.reporter_name}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
