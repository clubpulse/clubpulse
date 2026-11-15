import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getScoresPacksForClub } from '@/lib/admin/club-service';
import { ScoresPacksPanel } from '@/components/club/ScoresPacksPanel';
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
        <h1 style={{ ...h1, fontSize: '22px', marginBottom: '2px' }}>⭐ Scores packs</h1>
        <p style={muted}>
          Buy Scores to reward your members — they arrive instantly in your club pool
        </p>
      </div>

      <ScoresPacksPanel
        clubId={clubId}
        packs={result.data.packs}
        poolBalance={result.data.poolBalance}
        recentPurchases={result.data.recentPurchases}
      />
    </div>
  );
}
