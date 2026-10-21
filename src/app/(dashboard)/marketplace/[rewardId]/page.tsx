import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { fetchWallet } from '@/lib/profile/service';
import { fetchReward } from '@/lib/marketplace/service';
import { totalBalance } from '@/lib/types/scores';
import { formatScores } from '@/lib/utils/format';
import { RedemptionModal } from '@/components/marketplace/RedemptionModal';

export default async function RewardPage({ params }: { params: Promise<{ rewardId: string }> }) {
  const { rewardId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const [reward, wallet] = await Promise.all([fetchReward(supabase, rewardId), fetchWallet(supabase, user.id)]);
  if (!reward.success) notFound();

  const r = reward.data;
  const balance = totalBalance(wallet.success ? wallet.data : null);

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'Inter', sans-serif" }}>
      <Link href="/marketplace" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
        ← Marketplace
      </Link>

      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}>
        {r.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.image_url}
            alt=""
            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
          />
        )}

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#fff', margin: 0, letterSpacing: '-0.2px' }}>
              {r.title}
            </h1>
            {r.category && (
              <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', borderRadius: '6px', padding: '3px 8px' }}>
                {r.category}
              </span>
            )}
          </div>

          {r.description && (
            <p style={{ marginTop: '12px', fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              {r.description}
            </p>
          )}

          <div style={{ marginTop: '24px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <p style={{ margin: 0, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#c9a54c', fontVariantNumeric: 'tabular-nums' }}>
                {formatScores(r.creds_cost)} Scores
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                You have {formatScores(balance)}
                {r.stock_count !== null && ` · ${r.stock_count} left`}
              </p>
            </div>
            <RedemptionModal reward={r} balance={balance} />
          </div>
        </div>
      </div>
    </div>
  );
}
