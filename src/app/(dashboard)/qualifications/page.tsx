import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { getCourseTypes, getMyQualifications } from '@/lib/actions/ecb-courses';
import { CATEGORY_CONFIG, type CourseCategory } from '@/lib/types/ecb-courses';
import { QualificationBadge } from '@/components/ecb/QualificationBadge';
import { LogQualificationForm } from '@/components/ecb/LogQualificationForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Courses & Qualifications | ClubPulse' };

const heading: React.CSSProperties = {
  fontFamily: "'Syne', sans-serif",
  fontWeight: 800,
  fontSize: 22,
  color: '#fff',
  margin: '0 0 2px',
  letterSpacing: '-0.3px',
};

const sub: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: 'rgba(255,255,255,0.35)',
};

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: 24,
};

export default async function QualificationsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Get user's first active club membership
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id, clubs(name)')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  const clubId = membership?.club_id as string | undefined;
  const clubName = (membership?.clubs as unknown as { name: string } | null)?.name;

  const [coursesResult, qualsResult] = await Promise.all([
    getCourseTypes(),
    clubId ? getMyQualifications(clubId) : Promise.resolve({ success: true as const, data: [] }),
  ]);

  const coursesByCategory = coursesResult.success ? coursesResult.data : ({} as Record<CourseCategory, never[]>);
  const myQuals = qualsResult.success ? qualsResult.data : [];

  const totalScoresEarned = myQuals.reduce((sum, q) => sum + q.creds_awarded, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div>
        <h1 style={heading}>📋 Courses &amp; Qualifications</h1>
        <p style={sub}>{clubName ? `${clubName} · ` : ''}Log your ECB courses and earn Scores</p>
      </div>

      {!clubId && (
        <div style={{ ...card, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#fde68a' }}>
            You are not a member of any club yet. Join a club to log your qualifications.
          </p>
        </div>
      )}

      {/* My qualifications */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>My Qualifications</h2>
            {totalScoresEarned > 0 && (
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                {totalScoresEarned.toLocaleString()} Scores earned from qualifications
              </p>
            )}
          </div>
        </div>

        {myQuals.length === 0 ? (
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            No qualifications logged yet. Use the form below to add your first one.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myQuals.map(q => (
              <QualificationBadge key={q.id} qual={q} />
            ))}
          </div>
        )}
      </div>

      {/* Log a qualification */}
      {clubId && (
        <div style={card}>
          <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: '#fff' }}>Log a Qualification</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            Add an ECB course or qualification you have completed and earn Scores.
          </p>
          <LogQualificationForm clubId={clubId} coursesByCategory={coursesByCategory} />
        </div>
      )}

      {/* Course catalogue */}
      <div style={card}>
        <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#fff' }}>Course Catalogue</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(Object.entries(coursesByCategory) as [CourseCategory, typeof coursesByCategory[CourseCategory]][]).map(([cat, courses]) => {
            const cfg = CATEGORY_CONFIG[cat];
            return (
              <div key={cat}>
                <h3 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {cfg.emoji} {cfg.label}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {courses.map(course => (
                    <div key={course.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 10,
                      gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#fff' }}>{course.name}</p>
                        {course.description && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {course.description}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>+{course.creds_reward}</span>
                        {course.validity_months && (
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Renews {course.validity_months}mo</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
