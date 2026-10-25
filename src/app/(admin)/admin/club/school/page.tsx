import { requireClubAdminPage } from '@/lib/auth/admin-page';
import { listClubMembers } from '@/lib/admin/service';
import { getSchoolProgram, getAttendanceSessions, getTeamSelections } from '@/lib/actions/schools';
import { createClient } from '@/lib/supabase/server';
import { AdminSchoolTabs } from '@/components/school/AdminSchoolTabs';
import type { AgeGroup } from '@/lib/types/schools';

export default async function AdminSchoolPage() {
  const { user, clubId } = await requireClubAdminPage();

  const supabase = await createClient();

  const [programRes, membersRes, sessionsRes, selectionsRes] = await Promise.all([
    getSchoolProgram(clubId),
    listClubMembers(user.id, clubId),
    getAttendanceSessions(clubId),
    getTeamSelections(clubId),
  ]);

  // Fetch age group assignments for this club
  const { data: ageGroupRows } = await supabase
    .from('school_age_groups')
    .select('*')
    .eq('club_id', clubId)
    .eq('academic_year', new Date().getFullYear());

  const program = programRes.success ? programRes.data : null;
  const members = membersRes.success
    ? membersRes.data.map((m) => ({
        user_id: m.user_id,
        display_name: m.display_name,
        full_name: m.full_name,
      }))
    : [];
  const sessions = sessionsRes.success ? sessionsRes.data : [];
  const selections = selectionsRes.success ? selectionsRes.data : [];
  const ageGroupAssignments = (ageGroupRows ?? []).map((r) => ({
    id: r.id as string,
    club_id: r.club_id as string,
    user_id: r.user_id as string,
    age_group: r.age_group as AgeGroup,
    academic_year: r.academic_year as number,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 800,
          fontSize: '22px', color: '#fff', margin: '0 0 2px', letterSpacing: '-0.3px',
        }}>
          🏫 School Cricket
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
          {program ? `${program.school_name} · School program` : 'Enable school mode for this club'}
        </p>
      </div>

      <AdminSchoolTabs
        clubId={clubId}
        program={program}
        ageGroupAssignments={ageGroupAssignments}
        recentSessions={sessions}
        upcomingSelections={selections}
        members={members}
      />
    </div>
  );
}
