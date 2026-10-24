import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import {
  getSchoolProgram,
  getMyAgeGroup,
  getAttendanceSessions,
  getTeamSelections,
} from '@/lib/actions/schools';
import { AGE_GROUP_CONFIG } from '@/lib/types/schools';

export default async function SchoolPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Resolve the user's club
  const { data: membership } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect('/dashboard');
  const clubId = membership.club_id as string;

  const [programRes, myGroupRes] = await Promise.all([
    getSchoolProgram(clubId),
    getMyAgeGroup(clubId),
  ]);

  if (!programRes.success || !programRes.data) redirect('/dashboard');

  const program = programRes.data;
  const myGroup = myGroupRes.success ? myGroupRes.data : null;

  const [sessionsRes, selectionsRes] = await Promise.all([
    getAttendanceSessions(clubId, myGroup?.age_group),
    getTeamSelections(clubId, myGroup?.age_group),
  ]);

  const sessions = sessionsRes.success ? sessionsRes.data : [];
  const selections = selectionsRes.success ? selectionsRes.data : [];

  const attended = sessions.filter((s) => s.attendees.includes(user.id)).length;
  const total = sessions.length;
  const rate = total > 0 ? Math.round((attended / total) * 100) : null;

  const today = new Date().toISOString().slice(0, 10);
  const nextSession = sessions
    .filter((s) => s.session_date >= today)
    .sort((a, b) => a.session_date.localeCompare(b.session_date))[0] ?? null;

  const mySelections = selections.filter((s) => s.selected_players.includes(user.id));

  const groupCfg = myGroup ? AGE_GROUP_CONFIG[myGroup.age_group] : null;

  const card: React.CSSProperties = {
    background: '#0f0f0f',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding: '16px',
  };
  const dim: React.CSSProperties = {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'rgba(255,255,255,0.3)',
    margin: '0 0 8px',
  };
  const big: React.CSSProperties = {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: '32px',
    color: '#fff',
    margin: 0,
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '24px', color: '#fff', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
          🏫 School Cricket
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{program.school_name}</p>
      </div>

      {/* Age group badge */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px' }}>
        {myGroup && groupCfg ? (
          <>
            <span style={{
              background: groupCfg.color, color: '#fff',
              borderRadius: '8px', padding: '4px 14px',
              fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '14px',
            }}>
              {myGroup.age_group}
            </span>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
              {groupCfg.label} · {myGroup.academic_year}/{myGroup.academic_year + 1}
            </span>
          </>
        ) : (
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
            No age group assigned yet — ask your coach.
          </span>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={card}>
          <p style={dim}>Attendance</p>
          <p style={big}>{rate !== null ? `${rate}%` : '—'}</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>
            {attended} of {total} sessions
          </p>
        </div>
        <div style={card}>
          <p style={dim}>Selected for</p>
          <p style={big}>{mySelections.length}</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>
            upcoming {mySelections.length === 1 ? 'match' : 'matches'}
          </p>
        </div>
      </div>

      {/* Next session */}
      {nextSession && (
        <div style={card}>
          <p style={dim}>Next session</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(155,28,28,0.2)', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: 600, color: '#f87171' }}>
              {new Date(nextSession.session_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: 500 }}>
                {nextSession.session_name ?? nextSession.session_type.charAt(0).toUpperCase() + nextSession.session_type.slice(1)}
              </p>
              {nextSession.age_group && (
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                  {nextSession.age_group}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team selections */}
      {mySelections.length > 0 && (
        <div style={card}>
          <p style={dim}>You&apos;ve been selected</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {mySelections.map((sel) => (
              <div key={sel.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#fff', fontWeight: 500 }}>vs {sel.opposition}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                    {new Date(sel.match_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {sel.age_group}
                  </p>
                </div>
                <span style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 600 }}>
                  Selected ✓
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
