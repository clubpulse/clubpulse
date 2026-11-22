import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { communityOpen } from '@/lib/community/service';
import { crossBandOpen, getParentThread } from '@/lib/community/guardian';
import { endContactAction } from '@/lib/actions/community-social';
import { ActionButton, ClosedNotice, cardStyle } from '@/components/community/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your child’s conversation' };

export default async function ContactPage({ params }: { params: Promise<{ requestId: string }> }) {
  const user = await requireUser();
  if (!communityOpen() || !crossBandOpen()) return <ClosedNotice />;
  const { requestId } = await params;
  const r = await getParentThread(user.id, requestId);
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <p><Link href="/parent/community">← Parent Community</Link></p>
      {!r.success ? <div style={cardStyle}><h2 style={{ marginTop: 0 }}>Conversation not found</h2></div> : (
        <>
          <h1 style={{ marginTop: 0 }}>{r.data.childName} and {r.data.adultName}</h1>
          <p style={{ fontSize: 13, opacity: 0.7 }}>You are reading this because you approved the contact. It is read only and each visit is recorded.</p>
          {r.data.messages.length === 0 && <p>No messages yet.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0' }}>
            {r.data.messages.map((m) => (
              <div key={m.id} style={{ alignSelf: m.fromAdult ? 'flex-start' : 'flex-end', maxWidth: '80%', background: m.fromAdult ? 'rgba(255,255,255,0.08)' : '#60A5FA', color: m.fromAdult ? 'inherit' : '#0B1220', borderRadius: 14, padding: '8px 12px', whiteSpace: 'pre-wrap' }}>{m.body}</div>
            ))}
          </div>
          <ActionButton quiet label="End this contact" confirm="End this contact? They will not be able to message each other." run={endContactAction.bind(null, requestId)} />
        </>
      )}
    </div>
  );
}
