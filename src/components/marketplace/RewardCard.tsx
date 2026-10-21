import Link from 'next/link';
import { formatScores } from '@/lib/utils/format';
import type { Reward } from '@/lib/types/reward';

export function RewardCard({ reward, balance }: { reward: Reward; balance: number }) {
  const outOfStock = reward.stock_count !== null && reward.stock_count <= 0;
  const affordable = balance >= reward.creds_cost;

  return (
    <Link
      href={`/marketplace/${reward.id}`}
      style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', background: '#0f0f0f', transition: 'border-color 0.15s' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '4/3', background: '#161616', overflow: 'hidden' }}>
        {reward.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={reward.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        ) : (
          <span style={{ fontSize: '40px' }} aria-hidden>🎁</span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '14px', flex: 1, fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fff' }}>{reward.title}</h3>
          {reward.category && (
            <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.45)', borderRadius: '6px', padding: '2px 7px' }}>
              {reward.category}
            </span>
          )}
        </div>
        {reward.description && (
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {reward.description}
          </p>
        )}
        <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#c9a54c', fontVariantNumeric: 'tabular-nums' }}>
            {formatScores(reward.creds_cost)} Scores
          </span>
          {outOfStock ? (
            <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 500 }}>Out of stock</span>
          ) : affordable ? (
            <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 500 }}>✓ You can afford this</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
