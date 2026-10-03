import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { listSportConfigs } from '@/lib/admin/service';
import { SportConfigForm } from '@/components/admin/SportConfigForm';

export default async function SportConfigsPage() {
  const { ctx } = await requireClubAdminPage();
  const result = await listSportConfigs();

  if (!result.success) return <p className="text-sm text-red-400">{result.error}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Earning rules</h1>
        <p className="text-sm text-neutral-400">
          How many Creds each action earns. These are shared by every club, so only platform admins can edit them.
        </p>
      </div>
      {result.data.map((config) => (
        <SportConfigForm key={config.id} config={config} canEdit={ctx.isPlatformAdmin} />
      ))}
    </div>
  );
}
