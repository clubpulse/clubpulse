'use client';

import type { DbsCheck } from '@/lib/types/parent';
import { DBS_TYPE_LABELS } from '@/lib/types/parent';
import { card, cardTitle, muted } from '@/components/play/ui';

interface Props {
  checks: (DbsCheck & { user_name: string })[];
}

export default function DbsCheckList({ checks }: Props) {
  const expiringSoon = checks.filter(c => {
    if (c.status !== 'valid' || !c.expiry_date) return false;
    const daysLeft = (new Date(c.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft <= 90;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case 'valid': return '#00C853';
      case 'expired': return '#ff5252';
      case 'pending': return '#EFC84A';
      case 'rejected': return '#ff5252';
      default: return 'rgba(255,255,255,0.5)';
    }
  };

  return (
    <div>
      <h3 style={cardTitle}>DBS / Background Checks ({checks.length})</h3>

      {expiringSoon.length > 0 && (
        <div style={{
          ...card,
          background: 'rgba(255,82,82,0.08)',
          border: '1px solid rgba(255,82,82,0.2)',
          marginBottom: '0.75rem',
        }}>
          <div style={{ color: '#ff5252', fontWeight: 600, marginBottom: '0.25rem' }}>
            ⚠️ {expiringSoon.length} DBS check{expiringSoon.length !== 1 ? 's' : ''} expiring within 90 days
          </div>
          <div style={muted}>
            {expiringSoon.map(c => c.user_name).join(', ')}
          </div>
        </div>
      )}

      {checks.length === 0 ? (
        <p style={muted}>No DBS checks on record.</p>
      ) : (
        <div style={card}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={th}>Name</th>
                <th style={th}>Type</th>
                <th style={th}>Status</th>
                <th style={th}>Issued</th>
                <th style={th}>Expires</th>
              </tr>
            </thead>
            <tbody>
              {checks.map(c => {
                const isExpiring = c.status === 'valid' && c.expiry_date &&
                  (new Date(c.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 90;
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ ...td, color: '#fff', fontWeight: 500 }}>{c.user_name}</td>
                    <td style={td}>{DBS_TYPE_LABELS[c.check_type]}</td>
                    <td style={td}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem',
                        background: `${statusColor(c.status)}20`,
                        color: statusColor(c.status),
                      }}>
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td style={td}>{c.issue_date ?? '—'}</td>
                    <td style={{ ...td, color: isExpiring ? '#ff5252' : undefined, fontWeight: isExpiring ? 600 : undefined }}>
                      {c.expiry_date ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left', padding: '0.5rem 0.5rem',
  color: 'rgba(255,255,255,0.5)', fontWeight: 500, fontSize: '0.8rem',
};

const td: React.CSSProperties = {
  padding: '0.5rem 0.5rem', color: 'rgba(255,255,255,0.7)',
};
