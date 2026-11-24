import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { communityOpen } from '@/lib/community/service';
import { getChildrenOversight } from '@/lib/community/social';
import Link from 'next/link';
import { parentBlockAction, parentCancelAction, decideRequestAction, endContactAction, decideJuniorConnectionAction } from '@/lib/actions/community-social';
import { getApprovalsForParent } from '@/lib/community/junior-approval';
import { crossBandOpen, getParentRequests } from '@/lib/community/guardian';
import { ActionButton, ClosedNotice, cardStyle } from '@/components/community/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your child’s Community activity' };

export default async function ParentCommunity() {
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const r = await getChildrenOversight(user.id);
  const kids = r.success ? r.data : [];
  const asks = crossBandOpen() ? await getParentRequests(user.id) : null;
  const requests = asks && asks.success ? asks.data : [];
  const approvalsR = await getApprovalsForParent(user.id);
  const approvals = approvalsR.success ? approvalsR.data : [];
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <h1>Your child’s Community activity</h1>
      <p>You can see your child’s public profile, who they are connected to and who they follow. You cannot read their private messages with other young people. The one exception is a coach you have approved: you can read that conversation and end it at any time. You can cancel a request, block someone or report a concern for them.</p>
      {approvals.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Waiting for your yes</h2>
          <p>Two young people can message each other only once a parent of each has said yes. Nothing happens unless you approve.</p>
          {approvals.map((a) => (
            <div key={`${a.connectionId}-${a.childId}`} style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <strong>{a.childName}</strong> would like to connect with {a.otherName}{a.otherClub ? ` (${a.otherClub})` : ''}.
              {a.decided === 'approved'
                ? <p style={{ margin: '4px 0' }}>You approved. It opens once the other child’s parent approves too.</p>
                : <span style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <ActionButton label="Approve" run={decideJuniorConnectionAction.bind(null, a.connectionId, a.childId, true)} />
                    <ActionButton quiet label="Decline" run={decideJuniorConnectionAction.bind(null, a.connectionId, a.childId, false)} /></span>}
            </div>
          ))}
        </div>
      )}
      {requests.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Coaches asking to connect</h2>
          <p>Only coaches or club admins of your child’s club with a current enhanced DBS check can ask. Nothing happens unless you approve, and your child is asked only after you do.</p>
          {requests.map((q) => (
            <div key={q.id} style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              <strong>{q.adultName}</strong> would like to connect with {q.childName}{q.club ? ` (${q.club})` : ''}.
              {q.note && <p style={{ margin: '4px 0' }}>“{q.note}”</p>}
              {q.status === 'pending_parent' && <span style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <ActionButton label="Approve" run={decideRequestAction.bind(null, q.id, true)} />
                <ActionButton quiet label="Decline" run={decideRequestAction.bind(null, q.id, false)} /></span>}
              {q.status === 'pending_junior' && <p style={{ margin: '4px 0' }}>You approved. Waiting for {q.childName} to reply. <ActionButton quiet label="Withdraw" run={endContactAction.bind(null, q.id)} /></p>}
              {q.status === 'active' && <span style={{ display: 'flex', gap: 12, marginTop: 6, alignItems: 'center' }}>
                <Link href={`/parent/community/contact/${q.id}`}>Read the conversation</Link>
                <ActionButton quiet label="End" confirm="End this contact? They will not be able to message each other." run={endContactAction.bind(null, q.id)} /></span>}
            </div>
          ))}
        </div>
      )}
      {kids.length === 0 && <p>No children are linked to your account yet.</p>}
      {kids.map((k) => (
        <div key={k.childId} style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>{k.name}</h2>
          {!k.linkedUserId ? <p>{k.name} has no Community account linked yet. Ask the club admin to link it.</p> : (<>
            {k.profile?.headline && <p><strong>{k.profile.headline}</strong></p>}
            {k.profile?.about && <p>{k.profile.about}</p>}
            <h3>Recent posts</h3>
            {k.posts.length === 0 && <p>None.</p>}
            {k.posts.map((p) => <p key={p.id} style={{ margin: '4px 0' }}>{p.body}</p>)}
            <h3>Connections</h3>
            {k.connections.length === 0 && <p>None.</p>}
            {k.connections.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span>{c.name} · {c.state === 'connected' ? 'connected' : c.state === 'requested' ? 'request sent' : 'request received'}</span>
                {c.state !== 'connected' && <ActionButton quiet label="Cancel" run={parentCancelAction.bind(null, k.childId, c.id)} />}
              </div>
            ))}
            <h3>Following</h3>
            {k.following.length === 0 && <p>Nobody.</p>}
            {k.following.map((f) => (
              <div key={f.type + f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span>{f.name} · {f.type}</span>
                {f.type === 'player' && <ActionButton quiet label="Block" confirm={`Block ${f.name} for ${k.name}?`} run={parentBlockAction.bind(null, k.childId, f.id)} />}
              </div>
            ))}
          </>)}
        </div>
      ))}
    </div>
  );
}
