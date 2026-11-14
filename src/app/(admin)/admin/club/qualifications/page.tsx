import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { getClubQualifications, getExpiringQualifications, verifyQualification } from '@/lib/actions/ecb-courses';
import { CATEGORY_CONFIG } from '@/lib/types/ecb-courses';
import type { MemberQualification, ClubQualificationSummary } from '@/lib/types/ecb-courses';
import { VerifyButton } from '@/components/ecb/VerifyButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Club Qualifications | ClubPulse Admin' };

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 24,
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span style={{
      fontSize: 11,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 20,
      background: ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
      color: ok ? '#86efac' : '#fca5a5',
    }}>
      {ok ? '✓' : '✗'} {label}
    </span>
  );
}

function ExpiringAlert({ quals }: { quals: MemberQualification[] }) {
  if (quals.length === 0) return null;
  return (
    <div style={{
      ...card,
      background: 'rgba(251,191,36,0.06)',
      border: '1px solid rgba(251,191,36,0.2)',
    }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#fde68a' }}>
        ⚠️ Qualifications expiring in the next 90 days ({quals.length})
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {quals.map(q => {
          const course = q.course;
          const cat = course ? CATEGORY_CONFIG[course.category] : null;
          return (
            <div key={q.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 8,
              gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, color: '#fff' }}>
                  {cat?.emoji} {course?.name}
                </span>
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {q.expires_date ? new Date(q.expires_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MemberRow({ summary }: { summary: ClubQualificationSummary }) {
  const unverified = summary.qualifications.filter(q => !q.is_verified);
  return (
    <div style={{
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{summary.user_name}</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <StatusPill ok={summary.has_safeguarding} label="Safeguarding" />
          <StatusPill ok={summary.has_first_aid} label="First Aid" />
          {summary.coaching_level > 0 && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 20,
              background: 'rgba(59,130,246,0.15)',
              color: '#93c5fd',
            }}>
              🏏 Coaching L{summary.coaching_level}
            </span>
          )}
        </div>
      </div>

      {summary.qualifications.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {summary.qualifications.map(q => {
            const course = q.course;
            const cat = course ? CATEGORY_CONFIG[course.category] : null;
            return (
              <div key={q.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 8,
              }}>
                <span style={{ fontSize: 12 }}>{cat?.emoji}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{course?.name}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                  {new Date(q.completed_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                </span>
                {q.is_verified ? (
                  <span style={{ fontSize: 12, color: '#86efac' }}>✅</span>
                ) : (
                  <VerifyButton qualId={q.id} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {unverified.length > 0 && (
        <p style={{ margin: 0, fontSize: 11, color: 'rgba(251,191,36,0.7)' }}>
          {unverified.length} unverified qualification{unverified.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

export default async function ClubQualificationsPage() {
  const { clubId } = await requireClubAdminPage();

  const [summariesResult, expiringResult] = await Promise.all([
    getClubQualifications(clubId),
    getExpiringQualifications(clubId),
  ]);

  const summaries = summariesResult.success ? summariesResult.data : [];
  const expiring = expiringResult.success ? expiringResult.data : [];

  const totalMembers = summaries.length;
  const withSafeguarding = summaries.filter(s => s.has_safeguarding).length;
  const withFirstAid = summaries.filter(s => s.has_first_aid).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Inter', sans-serif" }}>

      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px' }}>
          Qualifications
        </h1>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
          Member ECB courses, certifications and compliance status
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {[
          { label: 'Members with quals', value: totalMembers },
          { label: 'Safeguarding', value: `${withSafeguarding} / ${totalMembers}` },
          { label: 'First Aid', value: `${withFirstAid} / ${totalMembers}` },
          { label: 'Expiring soon', value: expiring.length },
        ].map(stat => (
          <div key={stat.label} style={{
            ...card,
            padding: '16px 20px',
            textAlign: 'center',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: "'Syne', sans-serif" }}>
              {stat.value}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <ExpiringAlert quals={expiring} />

      {/* Member table */}
      <div style={card}>
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#fff' }}>
          Member Qualifications ({totalMembers})
        </h2>
        {summaries.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            No qualifications logged by club members yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summaries.map(s => (
              <MemberRow key={s.user_id} summary={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
