'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  VolunteerShift,
  ShiftWithSignups,
  VolunteerWithHours,
  VolunteerAnalytics,
  ShiftRole,
} from '@/lib/types/volunteer-shifts';

type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

// ── Shift CRUD ──────────────────────────────────────────────────────────────

export async function createShift(
  clubId: string,
  userId: string,
  input: {
    title: string;
    description?: string;
    role: ShiftRole;
    shift_date: string;
    start_time: string;
    end_time: string;
    location?: string;
    max_volunteers?: number;
    scores_bonus?: number;
    is_critical?: boolean;
  }
): Promise<ActionResult<VolunteerShift>> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('volunteer_shifts')
    .insert({
      club_id: clubId,
      created_by: userId,
      title: input.title,
      description: input.description ?? null,
      role: input.role,
      shift_date: input.shift_date,
      start_time: input.start_time,
      end_time: input.end_time,
      location: input.location ?? null,
      max_volunteers: input.max_volunteers ?? 1,
      scores_bonus: input.scores_bonus ?? 0,
      is_critical: input.is_critical ?? false,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as VolunteerShift };
}

export async function updateShift(
  shiftId: string,
  clubId: string,
  updates: Partial<{
    title: string;
    description: string | null;
    role: ShiftRole;
    shift_date: string;
    start_time: string;
    end_time: string;
    location: string | null;
    max_volunteers: number;
    scores_bonus: number;
    is_critical: boolean;
  }>
): Promise<ActionResult<VolunteerShift>> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('volunteer_shifts')
    .update(updates)
    .eq('id', shiftId)
    .eq('club_id', clubId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as VolunteerShift };
}

export async function deleteShift(
  shiftId: string,
  clubId: string
): Promise<ActionResult<null>> {
  const sb = createAdminClient();
  const { error } = await sb
    .from('volunteer_shifts')
    .delete()
    .eq('id', shiftId)
    .eq('club_id', clubId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

// ── Shift queries ───────────────────────────────────────────────────────────

export async function listShifts(
  clubId: string,
  opts?: { from?: string; to?: string; role?: ShiftRole }
): Promise<ShiftWithSignups[]> {
  const sb = createAdminClient();

  let q = sb
    .from('volunteer_shifts')
    .select(`
      *,
      volunteer_shift_signups (
        id, shift_id, user_id, status, check_in_at, check_out_at,
        hours_logged, scores_earned, notes, signed_up_at
      )
    `)
    .eq('club_id', clubId)
    .order('shift_date', { ascending: true })
    .order('start_time', { ascending: true });

  if (opts?.from) q = q.gte('shift_date', opts.from);
  if (opts?.to) q = q.lte('shift_date', opts.to);
  if (opts?.role) q = q.eq('role', opts.role);

  const { data, error } = await q;
  if (error || !data) return [];

  // Enrich signups with user names
  const userIds = new Set<string>();
  for (const shift of data) {
    const signups = (shift as unknown as { volunteer_shift_signups: { user_id: string }[] }).volunteer_shift_signups ?? [];
    for (const s of signups) userIds.add(s.user_id);
  }

  const userMap = new Map<string, { name: string; email: string }>();
  if (userIds.size > 0) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('id, display_name, email')
      .in('id', [...userIds]);
    for (const p of profiles ?? []) {
      userMap.set(p.id, { name: p.display_name || p.email || 'Unknown', email: p.email || '' });
    }
  }

  return data.map((row) => {
    const raw = row as unknown as VolunteerShift & { volunteer_shift_signups: Array<Record<string, unknown>> };
    const signups = (raw.volunteer_shift_signups ?? []).map((s) => ({
      ...s,
      user_name: userMap.get(s.user_id as string)?.name ?? 'Unknown',
      user_email: userMap.get(s.user_id as string)?.email ?? '',
    }));
    return {
      ...raw,
      signups: signups as ShiftWithSignups['signups'],
      signup_count: signups.length,
      spots_remaining: Math.max(0, raw.max_volunteers - signups.length),
      volunteer_shift_signups: undefined,
    } as unknown as ShiftWithSignups;
  });
}

export async function getUpcomingShifts(clubId: string, limit = 10): Promise<ShiftWithSignups[]> {
  const today = new Date().toISOString().slice(0, 10);
  const shifts = await listShifts(clubId, { from: today });
  return shifts.slice(0, limit);
}

// ── Signup management ───────────────────────────────────────────────────────

export async function checkoutSignup(
  signupId: string
): Promise<ActionResult<{ hours: number; scores_earned: number }>> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc('checkout_volunteer_shift', {
    p_signup_id: signupId,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { ok: boolean; error?: string; hours?: number; scores_earned?: number };
  if (!result.ok) return { success: false, error: result.error ?? 'checkout_failed' };
  return { success: true, data: { hours: result.hours ?? 0, scores_earned: result.scores_earned ?? 0 } };
}

export async function markNoShow(
  signupId: string
): Promise<ActionResult<null>> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc('mark_volunteer_no_show', {
    p_signup_id: signupId,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { ok: boolean; error?: string };
  if (!result.ok) return { success: false, error: result.error ?? 'no_show_failed' };
  return { success: true, data: null };
}

export async function cancelSignup(
  signupId: string
): Promise<ActionResult<null>> {
  const sb = createAdminClient();
  const { error } = await sb
    .from('volunteer_shift_signups')
    .update({ status: 'cancelled' })
    .eq('id', signupId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

// ── Volunteer roster ────────────────────────────────────────────────────────

export async function listVolunteers(clubId: string): Promise<VolunteerWithHours[]> {
  const sb = createAdminClient();

  // Get all club members with volunteer role
  const { data: members } = await sb
    .from('club_members')
    .select('user_id, role')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .eq('role', 'volunteer');

  if (!members?.length) return [];

  const userIds = members.map((m) => m.user_id);

  // Get profiles
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, display_name, email')
    .in('id', userIds);

  // Get hours summaries
  const { data: hours } = await sb
    .from('volunteer_hours_summary')
    .select('*')
    .eq('club_id', clubId)
    .in('user_id', userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { name: p.display_name || p.email || 'Unknown', email: p.email || '' }])
  );
  const hoursMap = new Map(
    (hours ?? []).map((h) => [h.user_id, h])
  );

  return members.map((m) => {
    const profile = profileMap.get(m.user_id);
    const h = hoursMap.get(m.user_id);
    return {
      user_id: m.user_id,
      user_name: profile?.name ?? 'Unknown',
      user_email: profile?.email ?? '',
      role: m.role,
      total_hours: Number(h?.total_hours ?? 0),
      total_shifts: h?.total_shifts ?? 0,
      total_scores: h?.total_scores ?? 0,
      no_show_count: h?.no_show_count ?? 0,
      last_shift_date: h?.last_shift_date ?? null,
    };
  });
}

// ── Analytics ───────────────────────────────────────────────────────────────

export async function getVolunteerAnalytics(clubId: string): Promise<VolunteerAnalytics> {
  const sb = createAdminClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const today = now.toISOString().slice(0, 10);

  // Total active volunteers
  const { count: totalVolunteers } = await sb
    .from('club_members')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('role', 'volunteer')
    .eq('is_active', true);

  // Upcoming shifts & unfilled spots
  const upcoming = await listShifts(clubId, { from: today });
  const unfilledSpots = upcoming.reduce((acc, s) => acc + s.spots_remaining, 0);

  // This month's completed signups
  const { data: monthSignups } = await sb
    .from('volunteer_shift_signups')
    .select('user_id, hours_logged, scores_earned, status')
    .in(
      'shift_id',
      (
        await sb
          .from('volunteer_shifts')
          .select('id')
          .eq('club_id', clubId)
          .gte('shift_date', monthStart)
      ).data?.map((r) => r.id) ?? []
    );

  const completedThisMonth = (monthSignups ?? []).filter((s) => s.status === 'completed');
  const noShowsThisMonth = (monthSignups ?? []).filter((s) => s.status === 'no_show');
  const activeUsers = new Set(completedThisMonth.map((s) => s.user_id));
  const totalHoursThisMonth = completedThisMonth.reduce((acc, s) => acc + Number(s.hours_logged ?? 0), 0);
  const totalScoresAwarded = completedThisMonth.reduce((acc, s) => acc + (s.scores_earned ?? 0), 0);

  const totalSignups = completedThisMonth.length + noShowsThisMonth.length;
  const noShowRate = totalSignups > 0 ? noShowsThisMonth.length / totalSignups : 0;

  return {
    total_volunteers: totalVolunteers ?? 0,
    active_this_month: activeUsers.size,
    total_hours_this_month: Math.round(totalHoursThisMonth * 10) / 10,
    total_scores_awarded: totalScoresAwarded,
    upcoming_shifts: upcoming.length,
    unfilled_spots: unfilledSpots,
    no_show_rate: Math.round(noShowRate * 100),
  };
}
