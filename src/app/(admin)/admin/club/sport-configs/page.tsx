import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { listSportConfigs } from '@/lib/admin/service';
import { SportConfigForm } from '@/components/admin/SportConfigForm';

export default async function SportConfigsPage() {
  const { ctx } = await requireClubAdminPage();
  const result = await listSportConfigs();

  if (!result.success) return (
    <p style={{ fontSize: '13px', color: '#f87171', fontFamily: "'Inter', sans-serif" }}>{result.error}</p>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          Earning rules
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          How many Scores each action earns. These are shared by every club, so only platform admins can edit them.
        </p>
      </div>
      {result.data.map((config) => (
        <SportConfigForm key={config.id} config={config} canEdit={ctx.isPlatformAdmin} />
      ))}
    </div>
  );
}
