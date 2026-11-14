'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type {
  SchoolProgram,
  SchoolAgeGroup,
  SchoolAttendance,
  SchoolTeamSelection,
  AgeGroup,
  SessionType,
} from '@/lib/types/schools';

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ── Player-facing reads ──────────────────────────────────────────────────────

export async function getSchoolProgram(
  clubId: string
): Promise<ActionResult<SchoolProgram | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('school_programs')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getMyAgeGroup(
  clubId: string
): Promise<ActionResult<SchoolAgeGroup | null>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from('school_age_groups')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', userId)
    .eq('academic_year', year)
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getAttendanceSessions(
  clubId: string,
  ageGroup?: AgeGroup
): Promise<ActionResult<SchoolAttendance[]>> {
  const supabase = await createClient();
  let q = supabase
    .from('school_attendance')
    .select('*')
    .eq('club_id', clubId)
    .order('session_date', { ascending: false })
    .limit(20);
  if (ageGroup) q = q.eq('age_group', ageGroup);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function getTeamSelections(
  clubId: string,
  ageGroup?: AgeGroup
): Promise<ActionResult<SchoolTeamSelection[]>> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  let q = supabase
    .from('school_team_selections')
    .select('*')
    .eq('club_id', clubId)
    .gte('match_date', today)
    .order('match_date', { ascending: true })
    .limit(10);
  if (ageGroup) q = q.eq('age_group', ageGroup);
  const { data, error } = await q;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

// ── Admin writes ─────────────────────────────────────────────────────────────

export async function adminSetupSchoolProgram(
  clubId: string,
  schoolName: string
): Promise<ActionResult<SchoolProgram>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('school_programs')
    .upsert(
      { club_id: clubId, school_name: schoolName, is_active: true },
      { onConflict: 'club_id' }
    )
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function adminAssignAgeGroup(
  memberId: string,
  clubId: string,
  ageGroup: AgeGroup
): Promise<ActionResult<SchoolAgeGroup>> {
  const callerId = await currentUserId();
  if (!callerId) return { success: false, error: 'Not authenticated' };
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const { data, error } = await supabase
    .from('school_age_groups')
    .upsert(
      { club_id: clubId, user_id: memberId, age_group: ageGroup, academic_year: year },
      { onConflict: 'club_id,user_id,academic_year' }
    )
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function adminCreateAttendanceSession(input: {
  clubId: string;
  sessionDate: string;
  sessionType: SessionType;
  sessionName?: string;
  ageGroup?: AgeGroup;
  attendees: string[];
}): Promise<ActionResult<SchoolAttendance>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('school_attendance')
    .insert({
      club_id: input.clubId,
      session_date: input.sessionDate,
      session_type: input.sessionType,
      session_name: input.sessionName ?? null,
      age_group: input.ageGroup ?? null,
      attendees: input.attendees,
      created_by: userId,
    })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function adminMarkAttendance(
  sessionId: string,
  attendeeIds: string[]
): Promise<ActionResult<SchoolAttendance>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('school_attendance')
    .update({ attendees: attendeeIds })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function adminSelectTeam(input: {
  clubId: string;
  matchDate: string;
  opposition: string;
  ageGroup: AgeGroup;
  selectedPlayers: string[];
  notes?: string;
}): Promise<ActionResult<SchoolTeamSelection>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('school_team_selections')
    .insert({
      club_id: input.clubId,
      match_date: input.matchDate,
      opposition: input.opposition,
      age_group: input.ageGroup,
      selected_players: input.selectedPlayers,
      notes: input.notes ?? null,
      created_by: userId,
    })
    .select()
    .single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}
