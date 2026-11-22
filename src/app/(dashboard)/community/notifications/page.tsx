import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { communityOpen } from '@/lib/community/service';
import { getNotifications } from '@/lib/community/notify';
import { markNotificationsReadAction } from '@/lib/actions/community-social';
import { ActionButton, ClosedNotice, cardStyle } from '@/components/community/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const { items, unread } = await getNotifications(createAdminClient(), user.id);
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <h1>Notifications</h1>
      {unread > 0 && <p><ActionButton quiet label="Mark all as read" run={markNotificationsReadAction} /></p>}
      {items.length === 0 && <p>Nothing yet. Requests to connect, and people who accept yours, appear here.</p>}
      {items.map((n) => (
        <div key={n.id} style={{ ...cardStyle, marginBottom: 10, opacity: n.read ? 0.7 : 1 }}>
          <strong>{n.title}</strong>
          {n.body && <p style={{ margin: '4px 0 0' }}>{n.body}</p>}
          <p style={{ margin: '6px 0 0' }}>
            <Link href={n.kind === 'connect_request' || n.kind === 'connect_accepted' ? '/community/connections' : n.kind === 'parent_connection' ? '/parent/community' : '/community/connections'}>Open</Link>
          </p>
        </div>
      ))}
    </div>
  );
}
