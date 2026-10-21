import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubMember } from '@/lib/admin/service';
import { MemberEditor } from '@/components/admin/MemberEditor';
import { formatDate } from '@/lib/utils/format';

export default async function MemberPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const { user } = await requireClubAdminPage();

  const result = await getClubMember(user.id, memberId);
  if (!result.success) notFound();
  const member = result.data;

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "'Inter', sans-serif" }}>
      <Link href="/admin/club/members" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>
        ← Members
      </Link>

      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        padding: '24px',
      }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.2px' }}>
          {member.full_name ?? member.display_name ?? 'Unnamed member'}
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          Joined {formatDate(member.joined_at)}
        </p>
        <MemberEditor member={member} />
      </div>
    </div>
  );
}
