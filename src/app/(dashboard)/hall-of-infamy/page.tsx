import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import {
  getInfamyCategories,
  getNominationsForCategory,
  getHallOfInfamy,
  getMyVotes,
  getClubMembers,
} from '@/lib/actions/infamy';
import { InfamyPageClient } from '@/components/infamy/InfamyPageClient';
import type { InfamyNomination } from '@/lib/types/infamy';

export default async function HallOfInfamyPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Resolve the player's first club membership
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  const clubId = membership?.club_id ?? '';

  if (!clubId) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          gap: '12px',
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: '40px' }}>🏆</span>
        <h1
          style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: '22px',
            color: '#fff',
            margin: 0,
          }}
        >
          Hall of Infamy
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '14px',
            color: 'rgba(255,255,255,0.4)',
            margin: 0,
          }}
        >
          You need to be a club member to view the Hall of Infamy.
        </p>
      </div>
    );
  }

  const season = new Date().getFullYear();

  const [categoriesResult, hallResult, myVotesResult, membersResult] = await Promise.all([
    getInfamyCategories(clubId),
    getHallOfInfamy(clubId),
    getMyVotes(clubId, season),
    getClubMembers(clubId),
  ]);

  const categories = categoriesResult.success ? categoriesResult.data : [];
  const pastWinners = hallResult.success ? hallResult.data : [];
  const myVotedIds = myVotesResult.success ? myVotesResult.data : [];
  const members = membersResult.success ? membersResult.data : [];

  // Fetch nominations for each category in parallel
  const nominationResults = await Promise.all(
    categories.map((cat) => getNominationsForCategory(cat.id, season)),
  );

  const nominationsByCategory: Record<string, InfamyNomination[]> = {};
  categories.forEach((cat, i) => {
    nominationsByCategory[cat.id] = nominationResults[i].success
      ? nominationResults[i].data
      : [];
  });

  return (
    <InfamyPageClient
      currentUserId={user.id}
      clubId={clubId}
      season={season}
      categories={categories}
      nominationsByCategory={nominationsByCategory}
      pastWinners={pastWinners}
      members={members}
      myVotedIds={myVotedIds}
    />
  );
}
