import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getScoresPacksForClub } from '@/lib/admin/club-service';
import { ClubPlanCard } from '@/components/club/ClubPlanCard';
import { h1, muted } from '@/components/play/ui';

export default async function ScoresPacksPage() {
  const { user, clubId } = await requireClubAdminPage();
  const result = await getScoresPacksForClub(user.id, clubId);

  if (!result.success) {
    return (
      <p style={{ fontSize: '14px', color: '#f87171' }}>
        Couldn&apos;t load Scores packs: {result.error}
      </p>
    );
  }

  const { poolBalance } = result.data;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div>
        <h1 style={{ ...h1, fontSize: '22px', marginBottom: '2px' }}>⭐ Scores for your club</h1>
        <p style={muted}>The Scores your club has to reward its members</p>
      </div>

      <ClubPlanCard title="Club pool" current={`${poolBalance.toLocaleString('en-GB')} Scores`}>
        Scores for your club are arranged as part of your agreement with ClubPulse, not bought here. If you would like more Scores
        for your members, or a different way of funding them, tell us and we will sort it out with you.
      </ClubPlanCard>
    </div>
  );
}
