import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { listVolunteerSessions } from '@/lib/admin/service';
import { VolunteerApprovalCard } from '@/components/admin/VolunteerApprovalCard';
import { VolunteerSessionsTable } from '@/components/admin/VolunteerSessionsTable';

export default async function VolunteersPage() {
  const { user, clubId } = await requireClubAdminPage();
  const result = await listVolunteerSessions(user.id, clubId);

  if (!result.success) return <p className="text-sm text-red-400">{result.error}</p>;

  const pending = result.data.filter((s) => !s.club_confirmed && s.status === 'pending');

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold text-white">Pending approvals</h1>
        {pending.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing waiting for approval.</p>
        ) : (
          pending.map((session) => <VolunteerApprovalCard key={session.id} session={session} />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">All sessions</h2>
        <VolunteerSessionsTable sessions={result.data} />
      </section>
    </div>
  );
}
