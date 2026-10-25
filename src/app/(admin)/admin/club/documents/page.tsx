import { requireClubAdminPage } from '@/lib/auth/admin-page';
import {
  getClubDocuments,
  adminAddDocument,
  adminDeactivateDocument,
  adminGetAcknowledgementStatus,
} from '@/lib/actions/documents';
import { CATEGORY_CONFIG, type DocumentCategory } from '@/lib/types/documents';
import { AdminDocumentsClient } from '@/components/documents/AdminDocumentsClient';

export const metadata = { title: 'Documents · Admin · ClubPulse' };

export default async function AdminDocumentsPage() {
  const { clubId } = await requireClubAdminPage();

  const docsResult = await getClubDocuments(clubId);
  const docs = docsResult.success ? docsResult.data : [];

  // Fetch ack status for mandatory docs
  const mandatoryDocs = docs.filter((d) => d.is_mandatory);
  const ackStatuses = await Promise.all(
    mandatoryDocs.map((d) => adminGetAcknowledgementStatus(d.id, clubId)),
  );
  const ackMap: Record<string, { total: number; acked: number; unacked: { user_id: string; display_name: string | null }[] }> = {};
  for (let i = 0; i < mandatoryDocs.length; i++) {
    const r = ackStatuses[i];
    if (r.success) {
      ackMap[mandatoryDocs[i].id] = {
        total: r.data.total_members,
        acked: r.data.acked_count,
        unacked: r.data.unacked_members,
      };
    }
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '22px',
          color: '#fff',
          margin: '0 0 2px',
          letterSpacing: '-0.3px',
        }}>
          📄 Club Documents
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          Manage club documents — constitutions, policies, meeting minutes. Mark as mandatory to track member acknowledgements.
        </p>
      </div>
      <AdminDocumentsClient
        clubId={clubId}
        initialDocs={docs}
        ackMap={ackMap}
      />
    </div>
  );
}
