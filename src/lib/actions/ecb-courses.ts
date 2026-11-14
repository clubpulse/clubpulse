'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type { EcbCourseType, MemberQualification, ClubQualificationSummary, CourseCategory } from '@/lib/types/ecb-courses';

// ── Course catalogue ───────────────────────────────────────────────────────────

export async function getCourseTypes(): Promise<ActionResult<Record<CourseCategory, EcbCourseType[]>>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ecb_course_types')
    .select('*')
    .order('display_order');

  if (error) return { success: false, error: error.message };

  const grouped = (data as EcbCourseType[]).reduce<Record<string, EcbCourseType[]>>((acc, course) => {
    if (!acc[course.category]) acc[course.category] = [];
    acc[course.category].push(course);
    return acc;
  }, {});

  return { success: true, data: grouped as Record<CourseCategory, EcbCourseType[]> };
}

// ── Player: my qualifications ──────────────────────────────────────────────────

export async function getMyQualifications(clubId: string): Promise<ActionResult<MemberQualification[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('member_qualifications')
    .select('*, course:ecb_course_types(*)')
    .eq('user_id', user.id)
    .eq('club_id', clubId)
    .order('completed_date', { ascending: false });

  if (error) return { success: false, error: error.message };

  const today = new Date().toISOString().split('T')[0];
  const quals = (data as MemberQualification[]).map(q => ({
    ...q,
    is_expired: q.expires_date ? q.expires_date < today : false,
  }));

  return { success: true, data: quals };
}

// ── Player: log a qualification ────────────────────────────────────────────────

export async function logQualification(
  clubId: string,
  courseTypeId: string,
  completedDate: string,
  certNumber?: string,
  expiresDate?: string,
): Promise<ActionResult<{ creds_awarded: number; expires_date: string | null }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase.rpc('log_qualification', {
    p_club_id: clubId,
    p_course_type_id: courseTypeId,
    p_completed_date: completedDate,
    p_certificate_number: certNumber ?? null,
    p_expires_date: expiresDate ?? null,
  });

  if (error) return { success: false, error: error.message };

  const result = data as { ok: boolean; error?: string; creds_awarded?: number; expires_date?: string };
  if (!result.ok) {
    const msg = result.error === 'already_logged'
      ? 'You have already logged this qualification for that date.'
      : result.error === 'course_not_found'
      ? 'Course not found.'
      : 'Something went wrong.';
    return { success: false, error: msg };
  }

  return { success: true, data: { creds_awarded: result.creds_awarded ?? 0, expires_date: result.expires_date ?? null } };
}

// ── Admin: all club qualifications ────────────────────────────────────────────

export async function getClubQualifications(clubId: string): Promise<ActionResult<ClubQualificationSummary[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('member_qualifications')
    .select('*, course:ecb_course_types(*), profile:profiles(full_name, display_name)')
    .eq('club_id', clubId)
    .order('completed_date', { ascending: false });

  if (error) return { success: false, error: error.message };

  const today = new Date().toISOString().split('T')[0];

  // Group by user_id
  const byUser = new Map<string, { name: string; quals: MemberQualification[] }>();
  for (const row of data as (MemberQualification & { profile: { full_name: string; display_name?: string } })[]) {
    if (!byUser.has(row.user_id)) {
      byUser.set(row.user_id, {
        name: row.profile?.display_name || row.profile?.full_name || 'Unknown',
        quals: [],
      });
    }
    byUser.get(row.user_id)!.quals.push({
      ...row,
      is_expired: row.expires_date ? row.expires_date < today : false,
    });
  }

  const summaries: ClubQualificationSummary[] = Array.from(byUser.entries()).map(([userId, { name, quals }]) => ({
    user_id: userId,
    user_name: name,
    qualifications: quals,
    has_safeguarding: quals.some(q => q.course?.category === 'safeguarding' && !q.is_expired),
    has_first_aid: quals.some(q => q.course?.category === 'first_aid' && !q.is_expired),
    coaching_level: Math.max(0, ...quals
      .filter(q => q.course?.category === 'coaching' && !q.is_expired && q.course?.level)
      .map(q => q.course!.level!)),
  }));

  return { success: true, data: summaries };
}

// ── Admin: verify a qualification ─────────────────────────────────────────────

export async function verifyQualification(qualId: string): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('member_qualifications')
    .update({ is_verified: true, verified_by: user.id, verified_at: new Date().toISOString() })
    .eq('id', qualId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

// ── Admin: expiring qualifications (next 90 days) ─────────────────────────────

export async function getExpiringQualifications(clubId: string): Promise<ActionResult<MemberQualification[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const today = new Date().toISOString().split('T')[0];
  const in90 = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('member_qualifications')
    .select('*, course:ecb_course_types(*), profile:profiles(full_name, display_name)')
    .eq('club_id', clubId)
    .gte('expires_date', today)
    .lte('expires_date', in90)
    .order('expires_date');

  if (error) return { success: false, error: error.message };

  return { success: true, data: data as MemberQualification[] };
}
