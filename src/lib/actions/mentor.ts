'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type {
  MentorProfile,
  MentorRequest,
  MentorSession,
  BattingStyle,
  BowlingStyle,
  Speciality,
} from '@/lib/types/mentor';

// ── Register / update own mentor profile ────────────────────────────────────

export async function registerAsMentor(profile: {
  club_id: string;
  batting_style?: BattingStyle;
  bowling_style?: BowlingStyle;
  speciality?: Speciality;
  years_experience: number;
  bio?: string;
  max_mentees?: number;
  is_available?: boolean;
}): Promise<ActionResult<MentorProfile>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const payload = {
    user_id: user.id,
    club_id: profile.club_id,
    batting_style: profile.batting_style ?? null,
    bowling_style: profile.bowling_style ?? null,
    speciality: profile.speciality ?? null,
    years_experience: profile.years_experience,
    bio: profile.bio ?? null,
    max_mentees: profile.max_mentees ?? 2,
    is_available: profile.is_available ?? true,
  };

  const { data, error } = await supabase
    .from('mentor_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as MentorProfile };
}

// ── List available mentors for a club ───────────────────────────────────────

export async function getAvailableMentors(
  clubId: string,
): Promise<ActionResult<MentorProfile[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('mentor_profiles')
    .select(`
      *,
      profile:profiles(full_name, avatar_url)
    `)
    .eq('club_id', clubId)
    .eq('is_available', true)
    .neq('user_id', user.id)
    .order('avg_rating', { ascending: false, nullsFirst: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as MentorProfile[] };
}

// ── Request a mentor ─────────────────────────────────────────────────────────

export async function requestMentor(
  mentorUserId: string,
  clubId: string,
  message?: string,
): Promise<ActionResult<MentorRequest>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('mentor_requests')
    .insert({
      mentee_user_id: user.id,
      mentor_user_id: mentorUserId,
      club_id: clubId,
      message: message ?? null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as MentorRequest };
}

// ── Accept a mentor request ──────────────────────────────────────────────────

export async function acceptMentorRequest(
  requestId: string,
): Promise<ActionResult<MentorRequest>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('mentor_requests')
    .update({ status: 'accepted', resolved_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('mentor_user_id', user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as MentorRequest };
}

// ── Decline a request ────────────────────────────────────────────────────────

export async function declineRequest(
  requestId: string,
): Promise<ActionResult<MentorRequest>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('mentor_requests')
    .update({ status: 'declined', resolved_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('mentor_user_id', user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as MentorRequest };
}

// ── Log a completed session (calls SECURITY DEFINER RPC) ────────────────────

export async function logSession(
  requestId: string,
  date: string,
  durationMinutes: number,
  notes?: string,
): Promise<ActionResult<{ session_id: string; mentor_creds: number; mentee_creds: number }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase.rpc('log_mentor_session', {
    p_request_id: requestId,
    p_session_date: date,
    p_duration_minutes: durationMinutes,
    p_notes: notes ?? null,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { ok: boolean; error?: string; session_id?: string; mentor_creds?: number; mentee_creds?: number };
  if (!result.ok) return { success: false, error: result.error ?? 'Failed to log session' };
  return {
    success: true,
    data: {
      session_id: result.session_id!,
      mentor_creds: result.mentor_creds!,
      mentee_creds: result.mentee_creds!,
    },
  };
}

// ── Rate a session (mentee only, calls SECURITY DEFINER RPC) ────────────────

export async function rateSession(
  sessionId: string,
  rating: number,
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase.rpc('rate_mentor_session', {
    p_session_id: sessionId,
    p_rating: rating,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { success: false, error: result.error ?? 'Failed to rate session' };
  return { success: true, data: undefined };
}

// ── Full dashboard data ──────────────────────────────────────────────────────

export async function getMyMentorDashboard(): Promise<
  ActionResult<{
    myMentorProfile: MentorProfile | null;
    requestsAsMentor: MentorRequest[];
    requestsAsMentee: MentorRequest[];
    sessions: MentorSession[];
  }>
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const [profileRes, asMentorRes, asMenteeRes, sessionsRes] = await Promise.all([
    supabase
      .from('mentor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('mentor_requests')
      .select('*')
      .eq('mentor_user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('mentor_requests')
      .select('*, mentor_profile:mentor_profiles(*)')
      .eq('mentee_user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('mentor_sessions')
      .select('*')
      .or(`mentor_user_id.eq.${user.id},mentee_user_id.eq.${user.id}`)
      .order('session_date', { ascending: false }),
  ]);

  return {
    success: true,
    data: {
      myMentorProfile: (profileRes.data ?? null) as MentorProfile | null,
      requestsAsMentor: (asMentorRes.data ?? []) as MentorRequest[],
      requestsAsMentee: (asMenteeRes.data ?? []) as MentorRequest[],
      sessions: (sessionsRes.data ?? []) as MentorSession[],
    },
  };
}
