import { requireUser } from '@/lib/auth/server';
import { isClubAdmin } from '@/lib/auth/admin';
import { getPosts, getUserClubId } from '@/lib/actions/dressing-room';
import { DressingRoomClient } from '@/components/dressing-room/DressingRoomClient';

export default async function DressingRoomPage() {
  const user = await requireUser();
  const clubId = await getUserClubId();

  if (!clubId) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '12px',
        fontFamily: "'Inter', sans-serif",
        color: 'rgba(255,255,255,0.45)',
        textAlign: 'center',
        padding: '0 24px',
      }}>
        <span style={{ fontSize: '48px' }}>🏏</span>
        <h2 style={{ margin: 0, color: '#fff', fontFamily: "'Syne', sans-serif", fontSize: '20px' }}>
          Not in a club yet
        </h2>
        <p style={{ margin: 0, fontSize: '14px' }}>
          The Dressing Room is a club-only space. Ask your club admin to add you.
        </p>
      </div>
    );
  }

  const [postsResult, adminStatus] = await Promise.all([
    getPosts(clubId, 50),
    isClubAdmin(user.id, clubId),
  ]);

  const posts = postsResult.success ? postsResult.data : [];

  return (
    <DressingRoomClient
      initialPosts={posts}
      clubId={clubId}
      currentUserId={user.id}
      isAdmin={adminStatus}
    />
  );
}
