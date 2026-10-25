import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getNotices } from '@/lib/actions/notices';
import { NoticeCard } from '@/components/noticeboard/NoticeCard';

export default async function NotiboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect('/dashboard');

  const clubId = membership.club_id as string;
  const notices = await getNotices(clubId);

  const pinned = notices.filter((n) => n.is_pinned);
  const rest = notices.filter((n) => !n.is_pinned);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '26px',
          color: '#fff',
          margin: '0 0 4px',
          letterSpacing: '-0.3px',
        }}>
          📋 Club Noticeboard
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
          Club announcements, updates and notices
        </p>
      </div>

      {notices.length === 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '14px',
          padding: '40px 24px',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.35)',
          fontSize: '14px',
        }}>
          No notices posted yet. Check back soon.
        </div>
      )}

      {pinned.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '13px',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: 'rgba(255,255,255,0.45)',
            margin: 0,
          }}>
            📌 Pinned
          </h2>
          {pinned.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </section>
      )}

      {rest.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pinned.length > 0 && (
            <h2 style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: 'rgba(255,255,255,0.45)',
              margin: 0,
            }}>
              Recent
            </h2>
          )}
          {rest.map((notice) => (
            <NoticeCard key={notice.id} notice={notice} />
          ))}
        </section>
      )}
    </div>
  );
}
