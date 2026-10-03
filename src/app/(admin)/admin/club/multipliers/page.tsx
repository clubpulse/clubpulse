import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { listMultipliers } from '@/lib/admin/service';
import { Card } from '@/components/ui/Card';
import { DynamicCredsPanel } from '@/components/admin/DynamicCredsPanel';
import { MultiplierForm } from '@/components/admin/MultiplierForm';

export default async function MultipliersPage() {
  const { user, clubId } = await requireClubAdminPage();
  const result = await listMultipliers(user.id, clubId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dynamic Creds</h1>
        <p className="text-sm text-neutral-400">
          Multipliers boost the Creds paid for volunteer shifts at your club while they are active (for example when you are short of volunteers).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {result.success ? <DynamicCredsPanel multipliers={result.data} /> : <p className="text-sm text-red-400">{result.error}</p>}
        </div>
        <div className="lg:col-span-2">
          <Card title="New multiplier">
            <MultiplierForm clubId={clubId} />
          </Card>
        </div>
      </div>
    </div>
  );
}
