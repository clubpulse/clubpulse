import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { communityOpen, getConnections } from '@/lib/community/service';
import { connectAction } from '@/lib/actions/community-social';
import { ActionButton, ClosedNotice, cardStyle } from '@/components/community/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Connections' };

export default async function ConnectionsPage() {
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const r = await getConnections(user.id);
  const rows = r.success ? r.data : [];
  const group = (state: string, title: string) => {
    const list = rows.filter((x) => x.state === state);
    if (!list.length) return null;
    return (
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        {list.map((x) => (
          <div key={x.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
            <Link href={`/community/people/${x.person.id}`}>{x.person.name}{x.person.club ? ` · ${x.person.club}` : ''}</Link>
            {state === 'incoming' && <span style={{ display: 'flex', gap: 8 }}>
              <ActionButton label="Accept" run={connectAction.bind(null, x.person.id, true)} />
              <ActionButton quiet label="Not now" run={connectAction.bind(null, x.person.id, false)} /></span>}
          </div>
        ))}
      </div>
    );
  };
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <h1>Connections</h1>
      {group('incoming', 'Requests to you')}{group('connected', 'Connected')}{group('requested', 'Waiting for a reply')}
      {rows.length === 0 && <p>No connections yet.</p>}
    </div>
  );
}
