import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { isMerchant, isPlatformAdmin } from '@/lib/auth/admin';
import { getMerchantInsights } from '@/lib/ai/merchant-intelligence';
import { SpendPatternChart } from '@/components/merchant/SpendPatternChart';
import { RedemptionHeatmap } from '@/components/merchant/RedemptionHeatmap';
import { MIN_COHORT } from '@/lib/types/merchant';

export default async function MerchantPage() {
  const user = await requireUser();
  const platformAdmin = isPlatformAdmin(user.id);
  if (!platformAdmin && !(await isMerchant(user.id))) redirect('/dashboard');

  const insights = await getMerchantInsights(platformAdmin ? undefined : user.id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          Merchant insights
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
          Anonymised and aggregated. Groups with fewer than {MIN_COHORT} redemptions are hidden to protect privacy.
        </p>
      </div>

      {/* Summary */}
      <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
            Summary
          </p>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{insights.totalRedemptions} redemptions</span>
        </div>
        <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{insights.summary}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Top categories */}
        <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px' }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 14px' }}>
            Top categories
          </p>
          <SpendPatternChart patterns={insights.topCategories} />
        </div>

        {/* By role */}
        <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px' }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 14px' }}>
            By role
          </p>
          {insights.roleBreakdown.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Not enough data to show roles yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {insights.roleBreakdown.map((r) => (
                <li key={r.role} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ textTransform: 'capitalize', color: 'rgba(255,255,255,0.7)' }}>{r.role.replace(/_/g, ' ')}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums', color: 'rgba(255,255,255,0.35)' }}>{r.redemptions}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Peak times */}
      <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', padding: '20px' }}>
        <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 14px' }}>
          Peak redemption times
        </p>
        <RedemptionHeatmap windows={insights.peakWindows} />
      </div>
    </div>
  );
}
