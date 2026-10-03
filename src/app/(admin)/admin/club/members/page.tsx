import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { listClubMembers } from '@/lib/admin/service';
import { MemberTable } from '@/components/admin/MemberTable';

export default async function MembersPage() {
  const { user, clubId } = await requireClubAdminPage();
  const members = await listClubMembers(user.id, clubId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Members</h1>
      {members.success ? (
        <MemberTable members={members.data} />
      ) : (
        <p className="text-sm text-red-400">{members.error}</p>
      )}
    </div>
  );
}
