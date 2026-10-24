import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getActiveRaffles, getPastRaffles } from '@/lib/actions/raffles';
import { AdminRafflePanel } from '@/components/raffle/AdminRafflePanel';

export default async function AdminRafflePage() {
  const { clubId } = await requireClubAdminPage();

  const [activeResult, pastResult] = await Promise.all([
    getActiveRaffles(clubId),
    getPastRaffles(clubId),
  ]);

  const activeRaffles = activeResult.success ? activeResult.data : [];
  const pastRaffles = pastResult.success ? pastResult.data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '22px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px',
        }}>
          🎟️ Raffles
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          Create prize draws and trigger winner selection
        </p>
      </div>
      <AdminRafflePanel clubId={clubId} activeRaffles={activeRaffles} pastRaffles={pastRaffles} />
    </div>
  );
}
