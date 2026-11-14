import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { listVolunteerSessions } from '@/lib/admin/service';
import { VolunteerApprovalCard } from '@/components/admin/VolunteerApprovalCard';
import { VolunteerSessionsTable } from '@/components/admin/VolunteerSessionsTable';

export default async function VolunteersPage() {
  const { user, clubId } = await requireClubAdminPage();
  const result = await listVolunteerSessions(user.id, clubId);

  if (!result.success) return (
    <p style={{ fontSize: '13px', color: '#f87171', fontFamily: "'Inter', sans-serif" }}>{result.error}</p>
  );

  const pending = result.data.filter((s) => !s.club_confirmed && s.status === 'pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: "'Inter', sans-serif" }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px' }}>
            Pending approvals
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            {pending.length === 0 ? 'Nothing waiting for approval' : `${pending.length} session${pending.length === 1 ? '' : 's'} need your sign-off`}
          </p>
        </div>
        {pending.length > 0 && pending.map((session) => (
          <VolunteerApprovalCard key={session.id} session={session} />
        ))}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#fff', margin: 0 }}>
          All sessions
        </h2>
        <VolunteerSessionsTable sessions={result.data} />
      </section>
    </div>
  );
}
