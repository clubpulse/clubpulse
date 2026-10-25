import type { DressingRoomPost } from '@/lib/types/dressing-room';

interface PostBubbleProps {
  post: DressingRoomPost;
  isOwn: boolean;
}

function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function PostBubble({ post, isOwn }: PostBubbleProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: '8px',
      maxWidth: '80%',
      alignSelf: isOwn ? 'flex-end' : 'flex-start',
    }}>
      {/* Avatar */}
      {!isOwn && (
        <div style={{
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          background: 'rgba(155,28,28,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          color: '#fff',
          flexShrink: 0,
          fontFamily: "'Inter', sans-serif",
        }}>
          {initials(post.display_name)}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        {!isOwn && (
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif", paddingLeft: '4px' }}>
            {post.display_name ?? 'Member'}
          </span>
        )}

        <div style={{
          background: isOwn ? '#166534' : 'rgba(255,255,255,0.08)',
          borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '9px 14px',
          maxWidth: '320px',
        }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#fff',
            lineHeight: 1.45,
            fontFamily: "'Inter', sans-serif",
            wordBreak: 'break-word',
          }}>
            {post.body}
          </p>
        </div>

        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', sans-serif", paddingLeft: '4px', paddingRight: '4px' }}>
          {formatTime(post.created_at)}
        </span>
      </div>
    </div>
  );
}
