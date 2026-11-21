import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { communityOpen } from '@/lib/community/service';
import { getClubProfile } from '@/lib/community/social';
import { followAction, saveClubProfileAction } from '@/lib/actions/community-social';
import { ActionButton, ClosedNotice, cardStyle } from '@/components/community/ui';
import { ClubProfileEditor } from '@/components/community/ClubProfileEditor';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Club profile' };

export default async function ClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const r = await getClubProfile(user.id, clubId);
  if (!r.success) return <div style={{ padding: 16 }}><h1>Club not found</h1></div>;
  const c = r.data;
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <div style={cardStyle}>
        <h1 style={{ marginTop: 0 }}>{c.name}</h1>
        <p>{[c.county, c.league, c.distance].filter(Boolean).join(' · ')}</p>
        {c.headline && <p><strong>{c.headline}</strong></p>}
        {c.about && <p>{c.about}</p>}
        {c.netsNotes && <p>Nets: {c.netsNotes}</p>}
        <p>{c.members} members · {c.followers} follower{c.followers === 1 ? '' : 's'}</p>
        <ActionButton label={c.following ? 'Unfollow' : 'Follow club'} run={() => followAction('club', clubId, !c.following)} />
      </div>
      {c.canEdit && <div style={{ ...cardStyle, marginTop: 16 }}><h2 style={{ marginTop: 0 }}>Edit club profile</h2>
        <ClubProfileEditor initial={{ headline: c.headline, about: c.about, netsNotes: c.netsNotes }} onSave={saveClubProfileAction.bind(null, clubId)} /></div>}
    </div>
  );
}
