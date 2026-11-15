/**
 * Server-side service functions for coach management (club admin).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { isClubAdmin } from '@/lib/auth/admin';
import { isUuid } from '@/lib/utils/validate';
import type { ActionResult } from '@/lib/types/action';
import type { CoachProfile, CoachCertification } from '@/lib/types/coach';

const FORBIDDEN = 'You do not have access to this club';

async function requireAdmin(userId: string, clubId: string): Promise<string | null> {
  if (!isUuid(clubId) || !(await isClubAdmin(userId, clubId))) return FORBIDDEN;
  return null;
}

// ── List coaches ────────────────────────────────────────────────────────────

export interface CoachWithProfile extends CoachProfile {
  certifications_count: number;
  pending_bookings: number;
}

export async function listCoaches(
  userId: string,
  clubId: string,
): Promise<ActionResult<CoachWithProfile[]>> {
  const denied = await requireAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  const admin = createAdminClient();

  const { data: coaches, error } = await admin
    .from('coach_profiles')
    .select('*, profiles:auth_user_id_fk(full_name, display_name)')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    // Fallback: try without the join (profiles FK may differ)
    const { data: fallback } = await admin
      .from('coach_profiles')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });

    const coachList = (fallback ?? []) as CoachProfile[];
    // Get profile names separately
    const userIds = coachList.map((c) => c.user_id);
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, display_name')
      .in('id', userIds);

    const profileMap = new Map(
      (profiles ?? []).map((p: { id: string; full_name: string | null; display_name: string | null }) => [p.id, p]),
    );

    const result: CoachWithProfile[] = coachList.map((c) => {
      const profile = profileMap.get(c.user_id);
      return {
        ...c,
        full_name: profile?.full_name ?? null,
        display_name: profile?.display_name ?? null,
        certifications_count: 0,
        pending_bookings: 0,
      };
    });

    // Get cert counts
    const coachIds = coachList.map((c) => c.id);
    if (coachIds.length > 0) {
      const { data: certs } = await admin
        .from('coach_certifications')
        .select('coach_id')
        .in('coach_id', coachIds);

      const certCounts = new Map<string, number>();
      (certs ?? []).forEach((c: { coach_id: string }) => {
        certCounts.set(c.coach_id, (certCounts.get(c.coach_id) ?? 0) + 1);
      });
      result.forEach((c) => {
        c.certifications_count = certCounts.get(c.id) ?? 0;
      });
    }

    return { success: true, data: result };
  }

  // Success path with join
  return {
    success: true,
    data: ((coaches ?? []) as CoachProfile[]).map((c) => ({
      ...c,
      certifications_count: 0,
      pending_bookings: 0,
    })),
  };
}

// ── Approve / reject coach ──────────────────────────────────────────────────

export async function approveCoach(
  userId: string,
  clubId: string,
  coachProfileId: string,
): Promise<ActionResult<void>> {
  const denied = await requireAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  const { error } = await createAdminClient()
    .from('coach_profiles')
    .update({
      is_approved: true,
      approved_at: new Date().toISOString(),
      approved_by: userId,
    })
    .eq('id', coachProfileId)
    .eq('club_id', clubId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function rejectCoach(
  userId: string,
  clubId: string,
  coachProfileId: string,
): Promise<ActionResult<void>> {
  const denied = await requireAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  const { error } = await createAdminClient()
    .from('coach_profiles')
    .update({ is_approved: false, approved_at: null, approved_by: null })
    .eq('id', coachProfileId)
    .eq('club_id', clubId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

// ── Verify certification ────────────────────────────────────────────────────

export async function verifyCertification(
  userId: string,
  clubId: string,
  certId: string,
): Promise<ActionResult<void>> {
  const denied = await requireAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  // Verify the cert belongs to a coach in this club
  const admin = createAdminClient();
  const { data: cert } = await admin
    .from('coach_certifications')
    .select('id, coach_id, coach_profiles!inner(club_id)')
    .eq('id', certId)
    .maybeSingle();

  if (!cert) return { success: false, error: 'Certification not found' };

  const { error } = await admin
    .from('coach_certifications')
    .update({
      verified: true,
      verified_at: new Date().toISOString(),
      verified_by: userId,
    })
    .eq('id', certId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

// ── Get coach detail (for admin view) ───────────────────────────────────────

export interface CoachDetail {
  profile: CoachProfile;
  certifications: CoachCertification[];
  recentBookings: {
    id: string;
    session_date: string;
    status: string;
    scores_paid: number;
    player_rating: number | null;
    listing_title: string | null;
  }[];
  stats: {
    totalSessions: number;
    completedSessions: number;
    avgRating: number | null;
    totalScoresEarned: number;
  };
}

export async function getCoachDetail(
  userId: string,
  clubId: string,
  coachProfileId: string,
): Promise<ActionResult<CoachDetail>> {
  const denied = await requireAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('coach_profiles')
    .select('*')
    .eq('id', coachProfileId)
    .eq('club_id', clubId)
    .maybeSingle();

  if (!profile) return { success: false, error: 'Coach not found' };

  // Get name from profiles table
  const { data: userProfile } = await admin
    .from('profiles')
    .select('full_name, display_name')
    .eq('id', profile.user_id)
    .maybeSingle();

  const [certsRes, bookingsRes] = await Promise.all([
    admin
      .from('coach_certifications')
      .select('*')
      .eq('coach_id', coachProfileId)
      .order('created_at', { ascending: false }),
    admin
      .from('coaching_bookings')
      .select('id, session_date, status, scores_paid, player_rating, listing:coaching_listings(title)')
      .eq('coach_user_id', profile.user_id)
      .eq('club_id', clubId)
      .order('session_date', { ascending: false })
      .limit(20),
  ]);

  const bookings = (bookingsRes.data ?? []) as unknown as {
    id: string;
    session_date: string;
    status: string;
    scores_paid: number;
    player_rating: number | null;
    listing: { title: string } | null;
  }[];

  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const ratings = completedBookings.filter((b) => b.player_rating != null);

  return {
    success: true,
    data: {
      profile: {
        ...(profile as CoachProfile),
        full_name: userProfile?.full_name ?? null,
        display_name: userProfile?.display_name ?? null,
      },
      certifications: (certsRes.data ?? []) as CoachCertification[],
      recentBookings: bookings.map((b) => ({
        id: b.id,
        session_date: b.session_date,
        status: b.status,
        scores_paid: b.scores_paid,
        player_rating: b.player_rating,
        listing_title: b.listing?.title ?? null,
      })),
      stats: {
        totalSessions: bookings.length,
        completedSessions: completedBookings.length,
        avgRating:
          ratings.length > 0
            ? Math.round(
                (ratings.reduce((s, b) => s + (b.player_rating ?? 0), 0) / ratings.length) * 10,
              ) / 10
            : null,
        totalScoresEarned: completedBookings.reduce(
          (s, b) => s + Math.max(b.scores_paid, 50),
          0,
        ),
      },
    },
  };
}

// ── Coaching analytics for club ─────────────────────────────────────────────

export interface CoachingAnalytics {
  totalCoaches: number;
  approvedCoaches: number;
  pendingApproval: number;
  totalSessions: number;
  completedSessions: number;
  totalScoresFlowed: number;
  avgRating: number | null;
  expiringCerts: number;
}

export async function getCoachingAnalytics(
  userId: string,
  clubId: string,
): Promise<ActionResult<CoachingAnalytics>> {
  const denied = await requireAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  const admin = createAdminClient();

  const [coachesRes, bookingsRes, certsRes] = await Promise.all([
    admin.from('coach_profiles').select('id, is_approved').eq('club_id', clubId),
    admin
      .from('coaching_bookings')
      .select('status, scores_paid, player_rating')
      .eq('club_id', clubId),
    admin
      .from('coach_certifications')
      .select('expiry_date, coach_id, coach_profiles!inner(club_id)')
      .not('expiry_date', 'is', null),
  ]);

  const coaches = coachesRes.data ?? [];
  const bookings = bookingsRes.data ?? [];
  const completed = bookings.filter(
    (b: { status: string }) => b.status === 'completed',
  );
  const ratings = completed.filter(
    (b: { player_rating: number | null }) => b.player_rating != null,
  );

  // Certs expiring within 30 days for this club's coaches
  const coachIds = new Set(coaches.map((c: { id: string }) => c.id));
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringCerts = (certsRes.data ?? []).filter(
    (c: { expiry_date: string; coach_id: string }) =>
      coachIds.has(c.coach_id) &&
      c.expiry_date &&
      new Date(c.expiry_date) <= thirtyDaysFromNow,
  );

  return {
    success: true,
    data: {
      totalCoaches: coaches.length,
      approvedCoaches: coaches.filter((c: { is_approved: boolean }) => c.is_approved).length,
      pendingApproval: coaches.filter((c: { is_approved: boolean }) => !c.is_approved).length,
      totalSessions: bookings.length,
      completedSessions: completed.length,
      totalScoresFlowed: completed.reduce(
        (s: number, b: { scores_paid: number }) => s + b.scores_paid,
        0,
      ),
      avgRating:
        ratings.length > 0
          ? Math.round(
              (ratings.reduce(
                (s: number, b: { player_rating: number | null }) =>
                  s + (b.player_rating ?? 0),
                0,
              ) /
                ratings.length) *
                10,
            ) / 10
          : null,
      expiringCerts: expiringCerts.length,
    },
  };
}
