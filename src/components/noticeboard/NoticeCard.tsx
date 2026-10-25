import type { Notice } from '@/lib/types/notices';
import { PRIORITY_CONFIG } from '@/lib/types/notices';

interface NoticeCardProps {
  notice: Notice;
}

export function NoticeCard({ notice }: NoticeCardProps) {
  const cfg = PRIORITY_CONFIG[notice.priority];

  const cardBg = notice.priority === 'urgent' ? '#fff5f5' : notice.priority === 'info' ? '#eff6ff' : '#fff';
  const borderColor = notice.priority === 'urgent' ? '#fca5a5' : notice.priority === 'info' ? '#bfdbfe' : '#e5e7eb';
  const badgeBg = notice.priority === 'urgent' ? '#fee2e2' : notice.priority === 'info' ? '#dbeafe' : '#f3f4f6';
  const badgeColor = notice.priority === 'urgent' ? '#b91c1c' : notice.priority === 'info' ? '#1d4ed8' : '#374151';

  const postedDate = new Date(notice.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const expiryDate = notice.expires_at
    ? new Date(notice.expires_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      })
    : null;

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${borderColor}`,
      borderRadius: '12px',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{
          background: badgeBg,
          color: badgeColor,
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '999px',
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
        }}>
          {cfg.emoji} {cfg.label}
        </span>

        {notice.is_pinned && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
          }}>
            📌 Pinned
          </span>
        )}
      </div>

      <h3 style={{
        margin: 0,
        fontFamily: "'Syne', sans-serif",
        fontWeight: 700,
        fontSize: '16px',
        color: '#111827',
        lineHeight: 1.3,
      }}>
        {notice.title}
      </h3>

      <p style={{
        margin: 0,
        fontSize: '14px',
        color: '#374151',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
      }}>
        {notice.body}
      </p>

      <div style={{
        display: 'flex',
        gap: '12px',
        fontSize: '12px',
        color: '#9ca3af',
        flexWrap: 'wrap',
        marginTop: '4px',
      }}>
        <span>Posted {postedDate}</span>
        {expiryDate && <span>· Expires {expiryDate}</span>}
      </div>
    </div>
  );
}
