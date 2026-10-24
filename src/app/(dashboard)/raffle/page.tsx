import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { fetchWallet } from '@/lib/profile/service';
import { getActiveRaffles, getPastRaffles, getRaffleWinners } from '@/lib/actions/raffles';
import { totalBalance } from '@/lib/types/scores';
import { formatScores } from '@/lib/utils/format';
import { RaffleCard, DrawnRaffleCard } from '@/components/raffle/RaffleCard';

async function getClubId(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data?.club_id ?? null;
}

export default async function RafflePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [clubId, wallet] = await Promise.all([
    getClubId(user.id),
    fetchWallet(supabase, user.id),
  ]);

  if (!clubId) {
    return (
      <p style={{ fontSize: '14px', color: '#f87171', fontFamily: "'Inter', sans-serif" }}>
        You need to be a club member to view raffles.
      </p>
    );
  }

  const balance = totalBalance(wallet.success ? wallet.data : null);

  const [activeResult, pastResult] = await Promise.all([
    getActiveRaffles(clubId),
    getPastRaffles(clubId),
  ]);

  const activeRaffles = activeResult.success ? activeResult.data : [];
  const pastRaffles = pastResult.success ? pastResult.data : [];

  const winnersMap: Record<string, Awaited<ReturnType<typeof getRaffleWinners>>['data']> = {};
  await Promise.all(
    pastRaffles.filter(r => r.status === 'drawn').map(async r => {
      const res = await getRaffleWinners(r.id);
      if (res.success) winnersMap[r.id] = res.data;
    })
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h1 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: '24px', color: '#fff', margin: 0, letterSpacing: '-0.3px',
          }}>
            🎟️ Raffle &amp; Prize Draws
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            Balance:{' '}
            <span style={{ fontWeight: 700, color: '#c9a54c' }}>{formatScores(balance)} Scores</span>
          </p>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          Spend your Scores on raffle tickets for a chance to win prizes
        </p>
      </div>

      <section>
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 700,
          fontSize: '16px', color: '#fff', margin: '0 0 14px',
        }}>
          Active draws
        </h2>
        {activeRaffles.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '14px',
            padding: '32px',
            textAlign: 'center',
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.3)' }}>
              No active raffles right now. Check back soon!
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {activeRaffles.map(raffle => (
              <RaffleCard key={raffle.id} raffle={raffle} userBalance={balance} />
            ))}
          </div>
        )}
      </section>

      {pastRaffles.length > 0 && (
        <section>
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 700,
            fontSize: '16px', color: '#fff', margin: '0 0 14px',
          }}>
            Past draws
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pastRaffles.map(raffle => (
              <DrawnRaffleCard
                key={raffle.id}
                raffle={raffle}
                winners={winnersMap[raffle.id] ?? []}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
