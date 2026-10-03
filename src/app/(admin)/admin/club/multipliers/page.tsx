import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { listMultipliers } from '@/lib/admin/service';
import { Card } from '@/components/ui/Card';
import { DynamicScoresPanel } from '@/components/admin/DynamicScoresPanel';
import { MultiplierForm } from '@/components/admin/MultiplierForm';

export default async function MultipliersPage() {
  const { user, clubId } = await requireClubAdminPage();
  const result = await listMultipliers(user.id, clubId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dynamic Scores</h1>
        <p className="text-sm text-neutral-400">
          Multipliers boost the Scores paid for volunteer shifts at your club while they are active (for example when you are short of volunteers).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {result.success ? <DynamicScoresPanel multipliers={result.data} /> : <p className="text-sm text-red-400">{result.error}</p>}
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
