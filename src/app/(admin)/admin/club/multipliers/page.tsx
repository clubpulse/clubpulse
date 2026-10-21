import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { listMultipliers } from '@/lib/admin/service';
import { DynamicScoresPanel } from '@/components/admin/DynamicScoresPanel';
import { MultiplierForm } from '@/components/admin/MultiplierForm';

export default async function MultipliersPage() {
  const { user, clubId } = await requireClubAdminPage();
  const result = await listMultipliers(user.id, clubId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          Dynamic Scores
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          Multipliers boost the Scores paid for volunteer shifts while active — useful when you&apos;re short of volunteers.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <div>
          {result.success ? (
            <DynamicScoresPanel multipliers={result.data} />
          ) : (
            <p style={{ fontSize: '13px', color: '#f87171' }}>{result.error}</p>
          )}
        </div>

        <div style={{
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '20px',
        }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 16px' }}>
            New multiplier
          </p>
          <MultiplierForm clubId={clubId} />
        </div>
      </div>
    </div>
  );
}
