import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { communityOpen } from '@/lib/community/service';
import { followState, getProfileGuarded } from '@/lib/community/social';
import { followAction, connectAction, blockAction } from '@/lib/actions/community-social';
import { ActionButton, ClosedNotice, cardStyle } from '@/components/community/ui';
import { ReportProfileButton } from '@/components/community/ReportProfileButton';
import { AskParentForm } from '@/components/community/AskParentForm';
import { canAskJunior } from '@/lib/community/guardian';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Community profile' };

export default async function PersonPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const r = await getProfileGuarded(user.id, userId);
  if (!r.success) return <div style={{ padding: 16 }}><h1>Profile not found</h1></div>;
  const p = r.data;
  const f = p.mine ? null : await followState(user.id, 'player', userId);
  // An adult who coaches this young person may ask their parent; nobody else sees this
  const mayAsk = !p.mine && p.junior && p.link === 'none' && (await canAskJunior(user.id, userId));
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>{p.name}</h1>
        <p>{[p.club, p.roles.join(', ')].filter(Boolean).join(' · ')}</p>
        {p.headline && <p><strong>{p.headline}</strong></p>}
        {p.about && <p>{p.about}</p>}
        {p.lookingFor.length > 0 && <p>Looking for: {p.lookingFor.join(', ')}</p>}
        <p>{p.connections} connection{p.connections === 1 ? '' : 's'}</p>
        {!p.mine && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {p.link === 'none' && !mayAsk && <ActionButton label="Connect" run={connectAction.bind(null, userId, true)} />}
            {p.link === 'incoming' && <ActionButton label="Accept" run={connectAction.bind(null, userId, true)} />}
            {p.link === 'requested' && <span>Request sent</span>}
            {p.link === 'connected' && <span>Connected</span>}
            {p.link === 'awaiting_parents' && <span>Waiting for parents to say yes</span>}
            {f?.canFollow && <ActionButton quiet label={f.following ? 'Unfollow' : 'Follow'} run={followAction.bind(null, 'player', userId, !f.following)} />}
            <ReportProfileButton userId={userId} />
            <ActionButton quiet label="Block" confirm="Block this person? They will not be able to find you." run={blockAction.bind(null, userId)} />
          </div>
        )}
      </div>
      {mayAsk && <div style={{ ...cardStyle, marginTop: 16 }}><AskParentForm juniorId={userId} name={p.name} /></div>}
    </div>
  );
}
