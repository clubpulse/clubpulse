import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getClubAuctions, getAuctionLots, getMyBids, getWalletBalance } from '@/lib/actions/auction';
import { LotCard } from '@/components/auction/LotCard';

export default async function AuctionPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Get user's club
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id, clubs(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  const clubId = membership?.club_id;
  const clubName = (membership?.clubs as { name?: string } | null)?.name ?? 'your club';

  // Get wallet balance
  const balanceRes = await getWalletBalance();
  const balance = balanceRes.success ? balanceRes.balance : 0;

  if (!clubId) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: '60px' }}>
        <p>You need to be a member of a club to view The Auction.</p>
      </div>
    );
  }

  const auctionsRes = await getClubAuctions(clubId);
  const auctions = auctionsRes.success ? auctionsRes.data : [];

  // Active auction = open one, else most recent non-draft
  const openAuction = auctions.find((a) => a.status === 'open');
  const upcomingAuction = auctions.find((a) => a.status === 'closed' || a.status === 'settled');
  const activeAuction = openAuction;

  const [lotsRes, myBidsRes] = activeAuction
    ? await Promise.all([
        getAuctionLots(activeAuction.id),
        getMyBids(activeAuction.id),
      ])
    : [{ success: true as const, data: [] }, { success: true as const, data: [] }];

  const lots = lotsRes.success ? lotsRes.data : [];
  const myBids = myBidsRes.success ? myBidsRes.data : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px' }}>
            🏏 The Auction
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            Bid Scores on your club-mates — earn big when they perform
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {activeAuction && (
            <span style={{
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'rgba(74,222,128,0.15)',
              color: '#4ade80',
            }}>
              🟢 Bidding Open
            </span>
          )}
          <span style={{
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'rgba(201,165,76,0.15)',
            color: '#c9a54c',
          }}>
            {balance} Scores available
          </span>
        </div>
      </div>

      {/* No open auction */}
      {!activeAuction && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '40px 24px',
          textAlign: 'center',
        }}>
          {upcomingAuction ? (
            <>
              <p style={{ margin: '0 0 6px', fontSize: '28px' }}>📅</p>
              <p style={{ margin: '0 0 4px', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff' }}>
                {upcomingAuction.name}
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                {upcomingAuction.status === 'closed' ? 'Bidding is closed — awaiting settlement.' : 'Auction settled for this season.'}
              </p>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 6px', fontSize: '28px' }}>🏏</p>
              <p style={{ margin: '0 0 4px', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff' }}>
                No auction open yet
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                {clubName} hasn't started an auction. Check back soon!
              </p>
            </>
          )}
        </div>
      )}

      {/* My winning bids summary */}
      {activeAuction && myBids.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h2 style={{ margin: '0 0 2px', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff' }}>
              My Winning Bids
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              {myBids.length} lot{myBids.length !== 1 ? 's' : ''} you're currently leading
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {myBids.map((lot) => (
              <div key={lot.id} style={{
                background: 'rgba(74,222,128,0.05)',
                border: '1px solid rgba(74,222,128,0.2)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fff' }}>{lot.display_name}</p>
                  {lot.role && <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{lot.role}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#4ade80' }}>{lot.current_bid} Scores</p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'rgba(74,222,128,0.6)' }}>Leading</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All lots */}
      {activeAuction && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h2 style={{ margin: '0 0 2px', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff' }}>
              {activeAuction.name}
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              {lots.length === 0
                ? 'No players listed yet'
                : `${lots.length} player${lots.length !== 1 ? 's' : ''} up for auction`}
              {activeAuction.bidding_closes_at && (
                <> · Closes {new Date(activeAuction.bidding_closes_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</>
              )}
            </p>
          </div>

          {lots.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '14px',
            }}>
              {lots.map((lot) => (
                <LotCard
                  key={lot.id}
                  lot={lot}
                  currentUserId={user.id}
                  balance={balance}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
