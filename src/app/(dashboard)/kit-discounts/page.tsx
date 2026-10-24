import { requireUser } from '@/lib/auth/server';
import { getKitRewards, getMyKitRedemptions, getMyCredsBalance } from '@/lib/actions/kit-discounts';
import { KitRewardCard } from '@/components/kit/KitRewardCard';
import { RedemptionHistory } from '@/components/kit/RedemptionHistory';

export default async function KitDiscountsPage() {
  const user = await requireUser();

  const [rewardsResult, redemptionsResult, balanceResult] = await Promise.all([
    getKitRewards(),
    getMyKitRedemptions(user.id),
    getMyCredsBalance(user.id),
  ]);

  const rewards = rewardsResult.success ? rewardsResult.data : [];
  const redemptions = redemptionsResult.success ? redemptionsResult.data : [];
  const balance = balanceResult.success ? balanceResult.data.total : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <section>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px' }}>
              🏏 Kit &amp; Equipment Discounts
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              Spend your Scores on cricket kit deals from top brands
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: '0 0 2px', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Your balance</p>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#c9a54c', fontVariantNumeric: 'tabular-nums' }}>
              {balance.toLocaleString('en-GB')} Scores
            </p>
          </div>
        </div>
      </section>

      {/* Kit deals grid */}
      <section>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 14px' }}>
          Available Deals
        </h2>

        {rewards.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', background: '#0f0f0f' }}>
            <p style={{ fontSize: '32px', margin: '0 0 12px' }} aria-hidden>🏏</p>
            <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: '#fff' }}>
              No kit deals available right now — check back soon
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
              We&apos;re negotiating new deals with kit suppliers for club members.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
            {rewards.map((reward) => (
              <KitRewardCard key={reward.id} reward={reward} balance={balance} />
            ))}
          </div>
        )}
      </section>

      {/* Redemption history */}
      <section>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: '0 0 14px' }}>
          My Redemptions
        </h2>
        <RedemptionHistory redemptions={redemptions} />
      </section>
    </div>
  );
}
