import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { ClubWatchClient } from '@/components/clubwatch/ClubWatchClient';

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

export default async function ClubWatchPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const clubId = await getUserClubId(user.id);

  if (!clubId) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.5)', fontSize: '14px', padding: '32px 0' }}>
        You need to be a member of a club to use ClubWatch.
      </div>
    );
  }

  // Fetch in parallel: categories, user's reports, club leaderboard
  const [categoriesRes, reportsRes, leaderboardRes] = await Promise.all([
    supabase
      .from('clubwatch_categories')
      .select('key, label, description, icon, scores')
      .order('sort_order'),
    supabase
      .from('clubwatch_reports')
      .select('id, category, note, photo_url, status, scores_awarded, review_note, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('clubwatch_leaderboard')
      .select('user_id, total_reports, verified_reports, total_scores')
      .eq('club_id', clubId)
      .order('total_scores', { ascending: false })
      .limit(20),
  ]);

  const categories = categoriesRes.data ?? [];
  const myReports = reportsRes.data ?? [];
  const rawLeaderboard = leaderboardRes.data ?? [];

  // Enrich leaderboard with display names
  const userIds = rawLeaderboard.map(e => e.user_id);
  let nameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, display_name')
      .in('id', userIds);

    for (const p of profiles ?? []) {
      nameMap[p.id] = p.display_name || p.full_name || 'Member';
    }
  }

  const leaderboard = rawLeaderboard.map(e => ({
    ...e,
    display_name: nameMap[e.user_id] ?? 'Member',
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '26px',
            color: '#fff',
            margin: '0 0 4px',
            letterSpacing: '-0.3px',
          }}>
            📸 ClubWatch
          </h1>
          <span style={{
            background: '#34D399',
            color: '#fff',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '999px',
          }}>NEW</span>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.45)' }}>
          Spot issues at the ground, report them, and earn Scores when your club verifies them.
        </p>
      </div>

      <ClubWatchClient
        categories={categories}
        myReports={myReports}
        leaderboard={leaderboard}
        currentUserId={user.id}
      />
    </div>
  );
}
