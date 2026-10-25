import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getClubLeaderboard, getMyBadges, getAllBadges } from '@/lib/actions/badges';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { BadgeGrid } from '@/components/badges/BadgeGrid';

async function getUserClubId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  return data?.club_id ?? null;
}

export default async function LeaderboardPage() {
  const user = await requireUser();
  const clubId = await getUserClubId(user.id);

  if (!clubId) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '32px 0' }}>
        You are not a member of any club yet.
      </div>
    );
  }

  const [leaderboardResult, myBadgesResult, allBadgesResult] = await Promise.all([
    getClubLeaderboard(clubId),
    getMyBadges(user.id),
    getAllBadges(),
  ]);

  const leaderboard = leaderboardResult.success ? leaderboardResult.data : [];
  const myBadges = myBadgesResult.success ? myBadgesResult.data : [];
  const allBadges = allBadgesResult.success ? allBadgesResult.data : [];

  // Badge count per user for the leaderboard
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();
  const { data: badgeRows } = await supabase
    .from('player_badges')
    .select('user_id')
    .in('user_id', leaderboard.map((e) => e.user_id))
    .eq('season', currentYear);

  const badgeCounts: Record<string, number> = {};
  for (const row of badgeRows ?? []) {
    badgeCounts[row.user_id] = (badgeCounts[row.user_id] ?? 0) + 1;
  }

  const currentSeason = currentYear;
  const myBadgesThisSeason = myBadges.filter((pb) => pb.season === currentSeason);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '26px',
          color: '#fff',
          margin: '0 0 4px',
          letterSpacing: '-0.3px',
        }}>
          🏅 Leaderboard &amp; Badges
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>
          {currentSeason} season — who&apos;s stacking Scores and collecting bragging rights?
        </p>
      </div>

      {/* Club Scores Leaderboard */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff', margin: 0 }}>
          Club Scores Ranking
        </h2>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          <LeaderboardTable
            entries={leaderboard.slice(0, 10)}
            currentUserId={user.id}
            badgeCounts={badgeCounts}
          />
        </div>
      </section>

      {/* My Badges This Season */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff', margin: 0 }}>
            Your Badges
          </h2>
          {myBadgesThisSeason.length > 0 && (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              {myBadgesThisSeason.length} earned this season
            </span>
          )}
        </div>

        {myBadgesThisSeason.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '24px',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 6px', fontSize: '22px' }}>🏆</p>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
              No badges yet — keep playing, predicting, and engaging to earn your first!
            </p>
          </div>
        ) : (
          <BadgeGrid
            badges={myBadgesThisSeason.map((pb) => pb.badge!).filter(Boolean)}
            earned={myBadgesThisSeason}
          />
        )}
      </section>

      {/* Badge Catalogue */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff', margin: 0 }}>
            Badge Catalogue
          </h2>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            {myBadges.length} / {allBadges.length} unlocked (all time)
          </span>
        </div>
        <BadgeGrid badges={allBadges} earned={myBadges} />
      </section>

    </div>
  );
}
