import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getClubDocuments, getMandatoryDocs } from '@/lib/actions/documents';
import { CATEGORY_CONFIG, type DocumentCategory, type ClubDocument } from '@/lib/types/documents';
import { AcknowledgeButton } from '@/components/documents/AcknowledgeButton';

export const metadata = { title: 'Documents · ClubPulse' };

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as DocumentCategory[];

async function getClubId(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .limit(1)
    .single();
  return data?.club_id ?? null;
}

function DocCard({ doc }: { doc: ClubDocument }) {
  const cat = CATEGORY_CONFIG[doc.category];
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '22px', lineHeight: 1 }}>{cat.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif" }}>
              {doc.title}
            </span>
            {doc.version && (
              <span style={{
                fontSize: '11px',
                padding: '1px 7px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: "'Inter', sans-serif",
              }}>
                {doc.version}
              </span>
            )}
            {doc.is_mandatory && (
              <span style={{
                fontSize: '10px',
                padding: '1px 7px',
                borderRadius: '20px',
                background: 'rgba(239,68,68,0.15)',
                color: '#f87171',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
              }}>
                Mandatory
              </span>
            )}
          </div>
          {doc.description && (
            <p style={{
              margin: '4px 0 0',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.45)',
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1.5,
            }}>
              {doc.description}
            </p>
          )}
        </div>
        <a
          href={doc.file_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff',
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 500,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          View ↗
        </a>
      </div>
    </div>
  );
}

export default async function DocumentsPage() {
  const user = await requireUser();
  const clubId = await getClubId(user.id);

  if (!clubId) {
    return (
      <p style={{ fontSize: '13px', color: '#f87171', fontFamily: "'Inter', sans-serif" }}>
        You are not a member of any club.
      </p>
    );
  }

  const [mandatoryResult, allDocsResult] = await Promise.all([
    getMandatoryDocs(clubId),
    getClubDocuments(clubId),
  ]);

  const mandatoryDocs = mandatoryResult.success ? mandatoryResult.data : [];
  const allDocs = allDocsResult.success ? allDocsResult.data : [];

  const pendingMandatory = mandatoryDocs.filter((d) => !d.acknowledged_at);
  const docsByCategory: Partial<Record<DocumentCategory, ClubDocument[]>> = {};
  for (const doc of allDocs) {
    if (!docsByCategory[doc.category]) docsByCategory[doc.category] = [];
    docsByCategory[doc.category]!.push(doc);
  }

  const usedCategories = CATEGORIES.filter((c) => (docsByCategory[c]?.length ?? 0) > 0);

  return (
    <div style={{ maxWidth: '720px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: '24px',
          color: '#fff',
          margin: '0 0 6px',
          letterSpacing: '-0.3px',
        }}>
          📄 Club Documents
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          Official club documents — constitutions, policies and meeting minutes.
        </p>
      </div>

      {/* Mandatory docs needing acknowledgement */}
      {pendingMandatory.length > 0 && (
        <div style={{
          marginBottom: '32px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '14px',
          padding: '20px',
        }}>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontWeight: 700,
            fontSize: '15px',
            color: '#f87171',
            margin: '0 0 4px',
          }}>
            You must read these
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
            {pendingMandatory.length} document{pendingMandatory.length !== 1 ? 's' : ''} awaiting your acknowledgement.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mandatoryDocs.map((doc) => {
              const cat = CATEGORY_CONFIG[doc.category];
              return (
                <div key={doc.id} style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '20px', lineHeight: 1 }}>{cat.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                          {doc.title}
                        </span>
                        {doc.version && (
                          <span style={{
                            fontSize: '11px',
                            padding: '1px 7px',
                            borderRadius: '20px',
                            background: 'rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.5)',
                          }}>
                            {doc.version}
                          </span>
                        )}
                      </div>
                      {doc.description && (
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                          {doc.description}
                        </p>
                      )}
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      View ↗
                    </a>
                  </div>
                  <AcknowledgeButton
                    documentId={doc.id}
                    initialAcknowledgedAt={doc.acknowledged_at}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documents by category */}
      {usedCategories.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '14px',
          border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
            No documents have been added yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {usedCategories.map((category) => {
            const cat = CATEGORY_CONFIG[category];
            const docs = docsByCategory[category]!;
            return (
              <section key={category}>
                <h2 style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.7)',
                  margin: '0 0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span>{cat.emoji}</span>
                  {cat.label}
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.07)',
                    padding: '1px 8px',
                    borderRadius: '20px',
                  }}>
                    {docs.length}
                  </span>
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {docs.map((doc) => <DocCard key={doc.id} doc={doc} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
