import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { adminGetAllNotices } from '@/lib/actions/notices';
import { NoticeboardAdminClient } from './NoticeboardAdminClient';

export default async function AdminNoticeboardPage() {
  const { clubId } = await requireClubAdminPage();
  const notices = await adminGetAllNotices(clubId);

  return <NoticeboardAdminClient clubId={clubId} notices={notices} />;
}
