import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { communityOpen } from '@/lib/community/service';
import { getChildrenOversight } from '@/lib/community/social';
import { parentBlockAction, parentCancelAction } from '@/lib/actions/community-social';
import { ActionButton, ClosedNotice, cardStyle } from '@/components/community/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your child’s Community activity' };

export default async function ParentCommunity() {
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const r = await getChildrenOversight(user.id);
  const kids = r.success ? r.data : [];
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: 16 }}>
      <h1>Your child’s Community activity</h1>
      <p>You can see your child’s public profile, who they are connected to and who they follow. You cannot read their private messages. You can cancel a request, block someone or report a concern for them.</p>
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
