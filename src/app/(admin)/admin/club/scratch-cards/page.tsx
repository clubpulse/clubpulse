import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getScratchCardConfig, getScratchCardPrizes, getClubScratchCards, getPendingScratchPrizes, getScratchCardTasks } from '@/lib/actions/scratch-cards';
import { PendingPrizes } from '@/components/scratch-cards/PendingPrizes';
import { AdminScratchCardsPanel } from '@/components/scratch-cards/AdminScratchCardsPanel';

export default async function AdminScratchCardsPage() {
  const { clubId } = await requireClubAdminPage();

  const [configResult, prizesResult, cardsResult, pendingResult, tasksResult] = await Promise.all([
    getScratchCardConfig(clubId),
    getScratchCardPrizes(clubId),
    getClubScratchCards(clubId),
    getPendingScratchPrizes(clubId),
    getScratchCardTasks(clubId),
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '22px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px',
        }}>
          🎰 Scratch Cards
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          Choose what earns a card, and set the prizes and their chances. Cards are earned, never bought.
        </p>
      </div>
      <PendingPrizes clubId={clubId} cards={pendingResult.success ? pendingResult.data : []} />
      <AdminScratchCardsPanel
        clubId={clubId}
        config={configResult.success ? configResult.data : null}
        prizes={prizesResult.success ? prizesResult.data : []}
        recentCards={cardsResult.success ? cardsResult.data : []}
        taskSettings={tasksResult.success ? tasksResult.data : null}
      />
    </div>
  );
}
