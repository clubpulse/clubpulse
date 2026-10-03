import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubMember } from '@/lib/admin/service';
import { Card } from '@/components/ui/Card';
import { MemberEditor } from '@/components/admin/MemberEditor';
import { formatDate } from '@/lib/utils/format';

export default async function MemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const { user } = await requireClubAdminPage();

  const result = await getClubMember(user.id, memberId);
  if (!result.success) notFound();
  const member = result.data;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/admin/club/members" className="text-sm text-neutral-400 hover:text-white">← Members</Link>
      <Card>
        <h1 className="text-xl font-bold text-white">{member.full_name ?? member.display_name ?? 'Unnamed member'}</h1>
        <p className="mb-6 text-sm text-neutral-500">Joined {formatDate(member.joined_at)}</p>
        <MemberEditor member={member} />
      </Card>
    </div>
  );
}
