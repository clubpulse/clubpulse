import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth/server';
import { communityOpen, getProfile } from '@/lib/community/service';
import { saveMyProfileAction } from '@/lib/actions/community-social';
import { ClosedNotice, ProfileForm, cardStyle } from '@/components/community/ui';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My Community profile' };

export default async function MyCommunityProfile() {
  const user = await requireUser();
  if (!communityOpen()) return <ClosedNotice />;
  const r = await getProfile(user.id, user.id);
  const p = r.success ? r.data : null;
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <h1>My Community profile</h1>
      <p>Other people see your first name and club, a rough distance, and what you write here. Never your address or your exact location.</p>
      <div style={cardStyle}>
        <ProfileForm initial={{ headline: p?.headline ?? '', about: p?.about ?? '', openToClub: p?.openToClub ?? false, lookingFor: p?.lookingFor ?? [], standard: p?.standard ?? '', availability: p?.availability ?? [] }}
          onSave={saveMyProfileAction} />
      </div>
    </div>
  );
}
