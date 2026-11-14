import type { DressingRoomPost } from '@/lib/types/dressing-room';

interface AnnouncementCardProps {
  post: DressingRoomPost;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function AnnouncementCard({ post }: AnnouncementCardProps) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(217,119,6,0.18) 0%, rgba(180,83,9,0.10) 100%)',
      border: '1px solid rgba(217,119,6,0.35)',
      borderRadius: '14px',
      padding: '16px 18px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {post.pinned && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          fontSize: '11px',
          color: '#f59e0b',
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          📌 Pinned
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px' }}>📢</span>
        <span style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 700,
          fontSize: '13px',
          color: '#f59e0b',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          Announcement
        </span>
      </div>

      <p style={{
        margin: '0 0 10px',
        fontSize: '15px',
        color: '#fff',
        lineHeight: 1.5,
        fontFamily: "'Inter', sans-serif",
        wordBreak: 'break-word',
      }}>
        {post.body}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'rgba(217,119,6,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
          fontFamily: "'Inter', sans-serif",
        }}>
          {(post.display_name ?? 'A')[0].toUpperCase()}
        </div>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', sans-serif" }}>
          {post.display_name ?? 'Admin'} · {formatDate(post.created_at)}
        </span>
      </div>
    </div>
  );
}
