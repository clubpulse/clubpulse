'use client';

import { useState, useTransition } from 'react';
import { AttendanceForm } from '@/components/school/AttendanceForm';
import { TeamSelectionForm } from '@/components/school/TeamSelectionForm';
import {
  adminSetupSchoolProgram,
  adminAssignAgeGroup,
  getAttendanceSessions,
  getTeamSelections,
} from '@/lib/actions/schools';
import type {
  AgeGroup,
  SchoolProgram,
  SchoolAgeGroup,
  SchoolAttendance,
  SchoolTeamSelection,
} from '@/lib/types/schools';
import { AGE_GROUP_CONFIG } from '@/lib/types/schools';

interface Member {
  user_id: string;
  display_name?: string | null;
  full_name?: string | null;
}

interface AdminSchoolTabsProps {
  clubId: string;
  program: SchoolProgram | null;
  ageGroupAssignments: SchoolAgeGroup[];
  recentSessions: SchoolAttendance[];
  upcomingSelections: SchoolTeamSelection[];
  members: Member[];
}

const AGE_GROUPS = Object.keys(AGE_GROUP_CONFIG) as AgeGroup[];

const TABS = ['Setup', 'Age Groups', 'Attendance', 'Team Selection'] as const;
type Tab = (typeof TABS)[number];

export function AdminSchoolTabs({
  clubId,
  program: initialProgram,
  ageGroupAssignments: initialAssignments,
  recentSessions,
  upcomingSelections,
  members,
}: AdminSchoolTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Setup');
  const [program, setProgram] = useState(initialProgram);
  const [schoolName, setSchoolName] = useState(initialProgram?.school_name ?? '');
  const [assignments, setAssignments] = useState<SchoolAgeGroup[]>(initialAssignments);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#fff',
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px',
  };

  const handleSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    startTransition(async () => {
      const res = await adminSetupSchoolProgram(clubId, schoolName);
      if (res.success) {
        setProgram(res.data);
        setSetupSuccess(true);
      } else {
        setSetupError(res.error);
      }
    });
  };

  const handleAssignAgeGroup = (userId: string, ageGroup: AgeGroup) => {
    startTransition(async () => {
      const res = await adminAssignAgeGroup(userId, clubId, ageGroup);
      if (res.success) {
        setAssignments((prev) => {
          const filtered = prev.filter(
            (a) => !(a.user_id === userId && a.club_id === clubId)
          );
          return [...filtered, res.data];
        });
      }
    });
  };

  const getAssignment = (userId: string): AgeGroup | null => {
    const year = new Date().getFullYear();
    return assignments.find((a) => a.user_id === userId && a.academic_year === year)?.age_group ?? null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '4px',
        background: '#111', borderRadius: '12px',
        padding: '4px', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              background: activeTab === tab ? '#9b1c1c' : 'transparent',
              border: 'none', borderRadius: '8px',
              padding: '8px 4px', fontSize: '12px', fontWeight: 600,
              color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Setup tab */}
      {activeTab === 'Setup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {program && (
            <div style={{
              padding: '12px 14px', borderRadius: '10px',
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
              fontSize: '13px', color: '#4ade80',
            }}>
              School mode active: <strong>{program.school_name}</strong>
            </div>
          )}
          <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>School name</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="e.g. Eton College Cricket"
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Age groups enabled</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {AGE_GROUPS.map((g) => (
                  <span key={g} style={{
                    padding: '4px 12px', borderRadius: '6px',
                    background: 'rgba(255,255,255,0.07)',
                    fontSize: '12px', color: 'rgba(255,255,255,0.7)',
                    fontWeight: 600,
                  }}>{g}</span>
                ))}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                All age groups (U11–U18 + Open) are included by default.
              </p>
            </div>
            {setupError && <p style={{ margin: 0, fontSize: '12px', color: '#f87171' }}>{setupError}</p>}
            {setupSuccess && <p style={{ margin: 0, fontSize: '12px', color: '#4ade80' }}>School program saved.</p>}
            <button
              type="submit"
              disabled={isPending}
              style={{
                background: isPending ? 'rgba(155,28,28,0.4)' : '#9b1c1c',
                color: '#fff', border: 'none', borderRadius: '10px',
                padding: '10px 20px', fontSize: '13px', fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer', alignSelf: 'flex-start',
              }}
            >
              {program ? 'Update school program' : 'Enable school mode'}
            </button>
          </form>
        </div>
      )}

      {/* Age Groups tab */}
      {activeTab === 'Age Groups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
            Assign each member to an age group for the current academic year. No personal data is stored — this links their account to a group only.
          </p>
          {members.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>No members to assign.</p>
          ) : (
            <div style={{
              background: '#111', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.07)',
              overflow: 'hidden',
            }}>
              {members.map((m, i) => {
                const current = getAssignment(m.user_id);
                const name = m.display_name || m.full_name || m.user_id.slice(0, 8);
                return (
                  <div key={m.user_id} style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: i < members.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <span style={{ fontSize: '13px', color: '#fff' }}>{name}</span>
                    <select
                      value={current ?? ''}
                      onChange={(e) => {
                        if (e.target.value) handleAssignAgeGroup(m.user_id, e.target.value as AgeGroup);
                      }}
                      style={{
                        background: '#1a1a1a',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '12px', color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">— unassigned —</option>
                      {AGE_GROUPS.map((g) => (
                        <option key={g} value={g}>{AGE_GROUP_CONFIG[g].label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Attendance tab */}
      {activeTab === 'Attendance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <AttendanceForm clubId={clubId} members={members} />
          {recentSessions.length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.3)' }}>
                Recent sessions
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {recentSessions.slice(0, 8).map((s) => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: '#111', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#fff', fontWeight: 500 }}>
                        {s.session_name ?? s.session_type}
                      </span>
                      {s.age_group && (
                        <span style={{ marginLeft: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                          · {s.age_group}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                        {new Date(s.session_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>
                        {s.attendees.length} attended
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Selection tab */}
      {activeTab === 'Team Selection' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <TeamSelectionForm clubId={clubId} members={members} />
          {upcomingSelections.length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.3)' }}>
                Upcoming selections
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {upcomingSelections.slice(0, 8).map((sel) => (
                  <div key={sel.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: '#111', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#fff', fontWeight: 500 }}>
                        vs {sel.opposition}
                      </span>
                      <span style={{ marginLeft: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                        · {sel.age_group}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                        {new Date(sel.match_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 600 }}>
                        {sel.selected_players.length} selected
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
