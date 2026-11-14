import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { listClubMembers } from '@/lib/admin/service';
import { MemberTable } from '@/components/admin/MemberTable';

export default async function MembersPage() {
  const { user, clubId } = await requireClubAdminPage();
  const members = await listClubMembers(user.id, clubId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '22px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px' }}>
          Members
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>All club members and their Scores balance</p>
      </div>
      {members.success ? (
        <MemberTable members={members.data} />
      ) : (
        <p style={{ fontSize: '13px', color: '#f87171' }}>{members.error}</p>
      )}
    </div>
  );
}
