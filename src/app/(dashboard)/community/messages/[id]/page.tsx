import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { communityOpen, getMessages } from '@/lib/community/service';
import { Chat } from '@/components/community/Chat';
import { ClosedNotice, cardStyle } from '@/components/community/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Messages' };

export default async function MessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const { id } = await params;
  const r = await getMessages(user.id, id);
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <p><Link href="/community/connections">← Connections</Link></p>
      {r.success ? (
        <>
          <h1 style={{ marginTop: 0 }}>{r.data.person.name}</h1>
          {r.data.person.club && <p style={{ opacity: 0.7, marginTop: -8 }}>{r.data.person.club}</p>}
          <Chat connectionId={id} personId={r.data.person.id} personName={r.data.person.name} messages={r.data.messages} />
        </>
      ) : (
        <div style={cardStyle}><h2 style={{ marginTop: 0 }}>Conversation not found</h2><p>This conversation is not available to you.</p></div>
      )}
    </div>
  );
}
