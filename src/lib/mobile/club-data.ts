// Member-facing reads and writes for the mobile app: coaches, volunteer shifts, a parent's
// children, DBS status and the admin approval queue.
//
// The /api/club/* routes are the club admin dashboard's API and refuse non-admins. These
// functions serve ordinary members instead. They use the service-role client, so every
// function scopes its queries to the caller by hand: their clubs, their signups, their
// children. Nothing here trusts an id from the request without checking it against the caller.

import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/lib/types/action';
import { decideJoinRequest, listJoinRequests } from './club-admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_RE.test(value);

const one = <T>(value: T | T[] | null | undefined): T | null => (Array.isArray(value) ? (value[0] ?? null) : (value ?? null));
const today = () => new Date().toISOString().slice(0, 10);

/* ── Membership ────────────────────────────────────────────────────────────── */

export async function getMemberClubIds(userId: string): Promise<string[]> {
  const { data } = await createAdminClient()
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true);
  return (data ?? []).map((row) => row.club_id as string);
}

export async function getAdminClubIds(userId: string): Promise<string[]> {
  const { data } = await createAdminClient()
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .eq('role', 'club_admin')
    .eq('is_active', true);
  return (data ?? []).map((row) => row.club_id as string);
}

async function profileNames(userIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (userIds.length === 0) return names;
  const { data } = await createAdminClient().from('profiles').select('id, full_name, display_name').in('id', userIds);
  for (const row of data ?? []) names.set(row.id as string, (row.full_name as string) || (row.display_name as string) || 'Member');
  return names;
}

/* ── Coaches ───────────────────────────────────────────────────────────────── */

export type MobileCoach = {
  id: string;
  full_name: string;
  bio: string | null;
  ecb_level: number | null;
  dbs_verified: boolean;
  /** Scores per hour, as set on the coach's profile */
  hourly_rate: number | null;
  specialisations: string[];
  rating: number | null;
  sessions_count: number;
};

export type MobileCoachDetail = MobileCoach & { availability: string[] };

const COACH_FIELDS = 'id, user_id, club_id, bio, specialisations, hourly_rate_scores, avg_rating, total_sessions';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type CoachRow = {
  id: string;
  user_id: string;
  bio: string | null;
  specialisations: string[] | null;
  hourly_rate_scores: number | null;
  avg_rating: number | string | null;
  total_sessions: number | null;
};

// Only certificates an admin has verified and that have not expired count towards badges
async function buildCoaches(rows: CoachRow[]): Promise<MobileCoach[]> {
  if (rows.length === 0) return [];
  const sb = createAdminClient();
  const [names, certs] = await Promise.all([
    profileNames(rows.map((r) => r.user_id)),
    sb
      .from('coach_certifications')
      .select('coach_id, cert_type, expiry_date')
      .in('coach_id', rows.map((r) => r.id))
      .eq('verified', true),
  ]);

  const current = (certs.data ?? []).filter((c) => !c.expiry_date || (c.expiry_date as string) >= today());

  return rows.map((row) => {
    const mine = current.filter((c) => c.coach_id === row.id).map((c) => c.cert_type as string);
    const levels = mine.map((t) => /^ecb_level_(\d)$/.exec(t)?.[1]).filter(Boolean).map(Number);
    return {
      id: row.id,
      full_name: names.get(row.user_id) ?? 'Coach',
      bio: row.bio,
      ecb_level: levels.length > 0 ? Math.max(...levels) : null,
      dbs_verified: mine.some((t) => t === 'dbs_basic' || t === 'dbs_enhanced'),
      hourly_rate: row.hourly_rate_scores && row.hourly_rate_scores > 0 ? row.hourly_rate_scores : null,
      specialisations: row.specialisations ?? [],
      rating: row.avg_rating === null ? null : Number(row.avg_rating),
      sessions_count: row.total_sessions ?? 0,
    };
  });
}

/** Approved, visible coaches at the caller's clubs. */
export async function listClubCoaches(userId: string): Promise<MobileCoach[]> {
  const clubIds = await getMemberClubIds(userId);
  if (clubIds.length === 0) return [];
  const { data } = await createAdminClient()
    .from('coach_profiles')
    .select(COACH_FIELDS)
    .in('club_id', clubIds)
    .eq('is_approved', true)
    .eq('is_visible', true)
    .order('total_sessions', { ascending: false });
  return buildCoaches((data ?? []) as CoachRow[]);
}

export async function getClubCoach(userId: string, coachId: string): Promise<MobileCoachDetail | null> {
  const clubIds = await getMemberClubIds(userId);
  if (clubIds.length === 0) return null;
  const sb = createAdminClient();
  const { data: row } = await sb
    .from('coach_profiles')
    .select(COACH_FIELDS)
    .eq('id', coachId)
    .in('club_id', clubIds)
    .eq('is_approved', true)
    .eq('is_visible', true)
    .maybeSingle();
  if (!row) return null;

  const [[coach], slots] = await Promise.all([
    buildCoaches([row as CoachRow]),
    sb
      .from('coach_availability')
      .select('day_of_week, start_time, end_time, location')
      .eq('coach_id', coachId)
      .eq('is_active', true)
      .order('day_of_week')
      .order('start_time'),
  ]);

  const availability = (slots.data ?? []).map((s) => {
    const time = `${String(s.start_time).slice(0, 5)}–${String(s.end_time).slice(0, 5)}`;
    return `${DAYS[s.day_of_week as number]} ${time}${s.location ? ` · ${s.location}` : ''}`;
  });
  return { ...coach, availability };
}

/* ── Volunteer shifts ──────────────────────────────────────────────────────── */

export type MobileShift = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  /** Wall-clock time at the ground, no timezone: 'YYYY-MM-DDTHH:MM:SS' */
  start_time: string;
  end_time: string;
  scores_reward: number;
  spots_total: number;
  spots_filled: number;
  signed_up: boolean;
};

// A signup in one of these states holds a place on the shift
const ACTIVE_SIGNUP = ['signed_up', 'confirmed', 'checked_in', 'completed'];

// Mirrors checkout_volunteer_shift(): the role's base rate for the club's sport plus the bonus
async function roleBaseScores(clubIds: string[]): Promise<Map<string, Record<string, number>>> {
  const sb = createAdminClient();
  const byClub = new Map<string, Record<string, number>>();
  const { data: clubs } = await sb.from('clubs').select('id, sport').in('id', clubIds);
  const sports = [...new Set((clubs ?? []).map((c) => (c.sport as string) || 'cricket'))];
  const { data: configs } = await sb.from('sport_configs').select('name, earning_rules').in('name', sports);
  for (const club of clubs ?? []) {
    const config = (configs ?? []).find((c) => c.name === ((club.sport as string) || 'cricket'));
    const rules = (config?.earning_rules as { volunteering?: Record<string, number> } | null)?.volunteering ?? {};
    byClub.set(club.id as string, rules);
  }
  return byClub;
}

/** Upcoming shifts at the caller's clubs. 'my' = ones they hold a place on; 'available' = the rest. */
export async function listMemberShifts(userId: string, tab: 'available' | 'my'): Promise<MobileShift[]> {
  const clubIds = await getMemberClubIds(userId);
  if (clubIds.length === 0) return [];
  const sb = createAdminClient();

  const { data: shifts } = await sb
    .from('volunteer_shifts')
    .select('id, club_id, title, description, role, shift_date, start_time, end_time, location, max_volunteers, scores_bonus')
    .in('club_id', clubIds)
    .gte('shift_date', today())
    .order('shift_date')
    .order('start_time')
    .limit(100);
  if (!shifts?.length) return [];

  const [{ data: signups }, base] = await Promise.all([
    sb.from('volunteer_shift_signups').select('shift_id, user_id, status').in('shift_id', shifts.map((s) => s.id)).in('status', ACTIVE_SIGNUP),
    roleBaseScores(clubIds),
  ]);

  return shifts
    .map((s) => {
      const taken = (signups ?? []).filter((x) => x.shift_id === s.id);
      return {
        id: s.id as string,
        title: s.title as string,
        description: s.description as string | null,
        location: s.location as string | null,
        start_time: `${s.shift_date}T${s.start_time}`,
        end_time: `${s.shift_date}T${s.end_time}`,
        scores_reward: (s.scores_bonus as number) + (base.get(s.club_id as string)?.[s.role as string] ?? 0),
        spots_total: s.max_volunteers as number,
        spots_filled: taken.length,
        signed_up: taken.some((x) => x.user_id === userId),
      };
    })
    .filter((s) => (tab === 'my' ? s.signed_up : !s.signed_up));
}

export async function signUpForShift(userId: string, shiftId: string): Promise<ActionResult<null>> {
  const clubIds = await getMemberClubIds(userId);
  const sb = createAdminClient();
  const { data: shift } = await sb.from('volunteer_shifts').select('id, club_id, shift_date, max_volunteers').eq('id', shiftId).maybeSingle();
  if (!shift || !clubIds.includes(shift.club_id as string)) return { success: false, error: 'Shift not found' };
  if ((shift.shift_date as string) < today()) return { success: false, error: 'This shift has already happened' };

  const { data: signups } = await sb.from('volunteer_shift_signups').select('id, user_id, status').eq('shift_id', shiftId);
  const mine = (signups ?? []).find((s) => s.user_id === userId);
  if (mine && ACTIVE_SIGNUP.includes(mine.status as string)) return { success: true, data: null };
  if (mine?.status === 'no_show') return { success: false, error: 'You were marked as a no-show for this shift' };

  const taken = (signups ?? []).filter((s) => ACTIVE_SIGNUP.includes(s.status as string)).length;
  if (taken >= (shift.max_volunteers as number)) return { success: false, error: 'This shift is full' };

  // A cancelled signup is revived, because (shift_id, user_id) is unique
  const { error } = mine
    ? await sb.from('volunteer_shift_signups').update({ status: 'signed_up', signed_up_at: new Date().toISOString() }).eq('id', mine.id)
    : await sb.from('volunteer_shift_signups').insert({ shift_id: shiftId, user_id: userId });
  if (error) return { success: false, error: 'Could not sign you up for this shift' };
  return { success: true, data: null };
}

export async function cancelShiftSignup(userId: string, shiftId: string): Promise<ActionResult<null>> {
  // Only before check-in: once checked in, an admin has to change the record
  const { data, error } = await createAdminClient()
    .from('volunteer_shift_signups')
    .update({ status: 'cancelled' })
    .eq('shift_id', shiftId)
    .eq('user_id', userId)
    .in('status', ['signed_up', 'confirmed'])
    .select('id');
  if (error) return { success: false, error: 'Could not cancel this shift' };
  if (!data?.length) return { success: false, error: 'You are not signed up for this shift' };
  return { success: true, data: null };
}

/* ── Children ──────────────────────────────────────────────────────────────── */

/** 'parent' if the caller is linked to the child, 'admin' if they run the child's club, else null. */
export async function childAccess(userId: string, childId: string): Promise<'parent' | 'admin' | null> {
  const sb = createAdminClient();
  const { data: link } = await sb.from('parent_child_links').select('id').eq('parent_id', userId).eq('child_id', childId).maybeSingle();
  if (link) return 'parent';
  const { data: child } = await sb.from('child_profiles').select('club_id').eq('id', childId).maybeSingle();
  if (child && (await getAdminClubIds(userId)).includes(child.club_id as string)) return 'admin';
  return null;
}

export type MobileJunior = {
  id: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string | null;
  medical_notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  relationship: string;
  link_verified: boolean;
  /** Latest decision per consent type; a type never answered is absent */
  consents: Record<string, 'granted' | 'withdrawn'>;
};

/** A child's record, for a linked parent only. */
export async function getJuniorForParent(userId: string, childId: string): Promise<MobileJunior | null> {
  const sb = createAdminClient();
  const { data: link } = await sb
    .from('parent_child_links')
    .select('relationship, verified_at, child_profiles ( id, first_name, last_name, date_of_birth, gender, medical_notes, emergency_contact_name, emergency_contact_phone )')
    .eq('parent_id', userId)
    .eq('child_id', childId)
    .maybeSingle();
  const child = one(link?.child_profiles);
  if (!link || !child) return null;

  const { data: records } = await sb
    .from('consent_records')
    .select('consent_type, action, created_at')
    .eq('child_id', childId)
    .order('created_at', { ascending: true });
  const consents: Record<string, 'granted' | 'withdrawn'> = {};
  for (const r of records ?? []) consents[r.consent_type as string] = r.action as 'granted' | 'withdrawn';

  return {
    id: child.id as string,
    full_name: `${child.first_name} ${child.last_name}`.trim(),
    date_of_birth: child.date_of_birth as string | null,
    gender: child.gender as string | null,
    medical_notes: child.medical_notes as string | null,
    emergency_contact_name: child.emergency_contact_name as string | null,
    emergency_contact_phone: child.emergency_contact_phone as string | null,
    relationship: link.relationship as string,
    link_verified: !!link.verified_at,
    consents,
  };
}

/* ── DBS checks ────────────────────────────────────────────────────────────── */

export type MobileDbsRecord = {
  id: string;
  holder_name: string;
  dbs_status: 'verified' | 'pending' | 'expired';
  expiry_date: string | null;
  role: string;
};

const DBS_TYPE: Record<string, string> = {
  basic: 'Basic DBS',
  standard: 'Standard DBS',
  enhanced: 'Enhanced DBS',
  enhanced_barred: 'Enhanced DBS with barred list',
};

/** Club admins see their club's checks; everyone else sees only their own. */
export async function listDbsForUser(userId: string): Promise<MobileDbsRecord[]> {
  const sb = createAdminClient();
  const adminClubs = await getAdminClubIds(userId);
  const query = sb.from('dbs_checks').select('id, user_id, check_type, expiry_date, status').order('expiry_date', { ascending: true }).limit(50);
  const { data } = adminClubs.length > 0 ? await query.in('club_id', adminClubs) : await query.eq('user_id', userId);
  const rows = data ?? [];
  const names = await profileNames([...new Set(rows.map((r) => r.user_id as string))]);

  return rows.map((r) => {
    const lapsed = r.status === 'expired' || r.status === 'rejected' || (!!r.expiry_date && (r.expiry_date as string) < today());
    return {
      id: r.id as string,
      holder_name: names.get(r.user_id as string) ?? 'Member',
      dbs_status: lapsed ? 'expired' : r.status === 'valid' ? 'verified' : 'pending',
      expiry_date: r.expiry_date as string | null,
      role: DBS_TYPE[r.check_type as string] ?? 'DBS check',
    };
  });
}

/* ── Admin approvals ───────────────────────────────────────────────────────── */

export type MobileApproval = {
  /** 'link:<parent_child_links.id>', 'coach:<coach_profiles.id>' or 'join:<club_join_requests.id>' */
  id: string;
  type: 'link_junior' | 'coach_verification' | 'join_club';
  requester_name: string;
  requester_id: string;
  details: string;
  status: 'pending';
  created_at: string;
};

/** Things waiting on a club admin: unverified parent links and unapproved coaches. */
export async function listApprovals(userId: string): Promise<MobileApproval[]> {
  const clubIds = await getAdminClubIds(userId);
  if (clubIds.length === 0) return [];
  const sb = createAdminClient();

  const [{ data: children }, { data: coaches }] = await Promise.all([
    sb.from('child_profiles').select('id, first_name, last_name').in('club_id', clubIds),
    sb.from('coach_profiles').select('id, user_id, created_at').in('club_id', clubIds).eq('is_approved', false),
  ]);

  const childIds = (children ?? []).map((c) => c.id as string);
  const { data: links } = childIds.length
    ? await sb.from('parent_child_links').select('id, parent_id, child_id, relationship, created_at').in('child_id', childIds).is('verified_at', null)
    : { data: [] as { id: string; parent_id: string; child_id: string; relationship: string; created_at: string }[] };

  const joins = await listJoinRequests(clubIds);
  const names = await profileNames([
    ...(links ?? []).map((l) => l.parent_id as string),
    ...(coaches ?? []).map((c) => c.user_id as string),
    ...joins.map((j) => j.user_id),
  ]);

  const items: MobileApproval[] = [
    ...joins.map((j) => ({
      id: `join:${j.id}`,
      type: 'join_club' as const,
      requester_name: names.get(j.user_id) ?? 'New member',
      requester_id: j.user_id,
      details: 'wants to join your club',
      status: 'pending' as const,
      created_at: j.created_at,
    })),
    ...(links ?? []).map((l) => {
      const child = (children ?? []).find((c) => c.id === l.child_id);
      return {
        id: `link:${l.id}`,
        type: 'link_junior' as const,
        requester_name: names.get(l.parent_id as string) ?? 'Parent',
        requester_id: l.parent_id as string,
        details: `${l.relationship} of ${child ? `${child.first_name} ${child.last_name}` : 'a junior'}`,
        status: 'pending' as const,
        created_at: l.created_at as string,
      };
    }),
    ...(coaches ?? []).map((c) => ({
      id: `coach:${c.id}`,
      type: 'coach_verification' as const,
      requester_name: names.get(c.user_id as string) ?? 'Coach',
      requester_id: c.user_id as string,
      details: 'wants to coach at your club',
      status: 'pending' as const,
      created_at: c.created_at as string,
    })),
  ];
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/**
 * Approves a request. Declining is not offered in the app: the schema has no "declined" state
 * for a coach, and turning a parent away removes a safeguarding record, so both are left to
 * the web dashboard.
 */
export async function approveRequest(userId: string, approvalId: string): Promise<ActionResult<null>> {
  const [kind, id] = approvalId.split(':');
  if (!isUuid(id)) return { success: false, error: 'Request not found' };
  const clubIds = await getAdminClubIds(userId);
  if (clubIds.length === 0) return { success: false, error: 'Only club admins can do this' };
  const sb = createAdminClient();
  const now = new Date().toISOString();

  if (kind === 'join') return decideJoinRequest(userId, id, true);

  if (kind === 'coach') {
    const { data, error } = await sb
      .from('coach_profiles')
      .update({ is_approved: true, approved_at: now, approved_by: userId })
      .eq('id', id)
      .in('club_id', clubIds)
      .select('id');
    if (error || !data?.length) return { success: false, error: 'Request not found' };
    return { success: true, data: null };
  }

  if (kind === 'link') {
    const { data: link } = await sb.from('parent_child_links').select('id, child_profiles ( club_id )').eq('id', id).maybeSingle();
    const child = one(link?.child_profiles);
    if (!link || !child || !clubIds.includes(child.club_id as string)) return { success: false, error: 'Request not found' };
    const { error } = await sb.from('parent_child_links').update({ verified_at: now, verified_by: userId }).eq('id', id);
    if (error) return { success: false, error: 'Could not approve this link' };
    return { success: true, data: null };
  }

  return { success: false, error: 'Request not found' };
}

/* ── Registering a child ───────────────────────────────────────────────────── */

const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;
const RELATIONSHIPS = ['parent', 'guardian', 'carer'] as const;
export const CONSENT_TYPES = [
  'photo_video',
  'data_processing',
  'medical_treatment',
  'travel',
  'social_media',
  'coaching_observation',
  'general_participation',
] as const;
export type ConsentTypeName = (typeof CONSENT_TYPES)[number];

const MAX_CHILDREN_PER_PARENT = 10;

export type RegisterJuniorInput = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: (typeof GENDERS)[number] | null;
  relationship: (typeof RELATIONSHIPS)[number];
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_notes: string | null;
  consents: ConsentTypeName[];
  club_id: string | null;
};

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
};

function ageOn(dob: Date, now: Date): number {
  const age = now.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dob.getUTCMonth() || (now.getUTCMonth() === dob.getUTCMonth() && now.getUTCDate() < dob.getUTCDate());
  return beforeBirthday ? age - 1 : age;
}

/** Checks and tidies the form the app sends. Everything here is untrusted input. */
export function parseRegisterJunior(body: unknown): ActionResult<RegisterJuniorInput> {
  const fail = (error: string) => ({ success: false as const, error });
  if (typeof body !== 'object' || body === null) return fail('Invalid request');
  const input = body as Record<string, unknown>;

  const first_name = text(input.first_name, 60);
  const last_name = text(input.last_name, 60);
  if (!first_name || !last_name) return fail('Enter the child’s first and last name');

  // A real calendar date, in the past, for someone under 18
  const dobText = typeof input.date_of_birth === 'string' ? input.date_of_birth : '';
  const dob = /^\d{4}-\d{2}-\d{2}$/.test(dobText) ? new Date(`${dobText}T00:00:00Z`) : null;
  if (!dob || Number.isNaN(dob.getTime()) || dob.toISOString().slice(0, 10) !== dobText) {
    return fail('Enter a valid date of birth');
  }
  const now = new Date();
  if (dob.getTime() > now.getTime()) return fail('The date of birth can’t be in the future');
  if (ageOn(dob, now) >= 18) return fail('Only under-18s can be registered as a child');

  const gender = input.gender == null || input.gender === '' ? null : input.gender;
  if (gender !== null && !(GENDERS as readonly unknown[]).includes(gender)) return fail('Invalid gender');

  const relationship = input.relationship ?? 'parent';
  if (!(RELATIONSHIPS as readonly unknown[]).includes(relationship)) return fail('Invalid relationship');

  const nameGiven = input.emergency_contact_name != null && input.emergency_contact_name !== '';
  const emergency_contact_name = nameGiven ? text(input.emergency_contact_name, 100) : null;
  if (nameGiven && !emergency_contact_name) return fail('The emergency contact name is too long');

  const phoneGiven = input.emergency_contact_phone != null && input.emergency_contact_phone !== '';
  const emergency_contact_phone = phoneGiven ? text(input.emergency_contact_phone, 20) : null;
  if (phoneGiven && (!emergency_contact_phone || !/^\+?[\d\s()-]{7,20}$/.test(emergency_contact_phone))) {
    return fail('Enter a valid emergency contact phone number');
  }

  const notesGiven = input.medical_notes != null && input.medical_notes !== '';
  const medical_notes = notesGiven ? text(input.medical_notes, 1000) : null;
  if (notesGiven && !medical_notes) return fail('Medical notes can be up to 1,000 characters');

  const rawConsents = Array.isArray(input.consents) ? input.consents : [];
  if (rawConsents.some((c) => !(CONSENT_TYPES as readonly unknown[]).includes(c))) return fail('Invalid consent');

  const club_id = input.club_id == null ? null : input.club_id;
  if (club_id !== null && !isUuid(club_id)) return fail('Invalid club');

  return {
    success: true,
    data: {
      first_name,
      last_name,
      date_of_birth: dobText,
      gender: gender as RegisterJuniorInput['gender'],
      relationship: relationship as RegisterJuniorInput['relationship'],
      emergency_contact_name,
      emergency_contact_phone,
      medical_notes,
      consents: [...new Set(rawConsents as ConsentTypeName[])],
      club_id,
    },
  };
}

/**
 * Registers a child at one of the caller's clubs and links the caller as their parent.
 * The link starts unverified: a club admin confirms it from the approvals queue.
 * Consents ticked on the form are recorded as granted, with the caller's IP and device.
 */
export async function registerJunior(
  userId: string,
  input: RegisterJuniorInput,
  meta: { ip_address?: string; user_agent?: string },
): Promise<ActionResult<{ id: string }>> {
  const sb = createAdminClient();

  const { data: memberships } = await sb
    .from('club_members')
    .select('club_id, role, joined_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true });
  const clubs = memberships ?? [];
  if (clubs.length === 0) return { success: false, error: 'Join a club before registering a child' };

  // Same choice of club as the rest of the app unless the request names one of the caller's clubs
  const clubId = input.club_id ?? ((clubs.find((c) => c.role === 'club_admin') ?? clubs[0]).club_id as string);
  if (!clubs.some((c) => c.club_id === clubId)) return { success: false, error: 'You are not a member of that club' };

  const { data: links } = await sb
    .from('parent_child_links')
    .select('child_profiles ( club_id, first_name, last_name, date_of_birth )')
    .eq('parent_id', userId);
  const existing = (links ?? []).map((l) => one(l.child_profiles)).filter((c) => c !== null);
  if (existing.length >= MAX_CHILDREN_PER_PARENT) {
    return { success: false, error: 'You have reached the limit for children on one account. Contact your club.' };
  }
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  const duplicate = existing.some(
    (c) =>
      c.club_id === clubId &&
      c.date_of_birth === input.date_of_birth &&
      same(c.first_name as string, input.first_name) &&
      same(c.last_name as string, input.last_name),
  );
  if (duplicate) return { success: false, error: `${input.first_name} is already registered on your account` };

  const { data: child, error: childError } = await sb
    .from('child_profiles')
    .insert({
      club_id: clubId,
      first_name: input.first_name,
      last_name: input.last_name,
      date_of_birth: input.date_of_birth,
      gender: input.gender,
      medical_notes: input.medical_notes,
      emergency_contact_name: input.emergency_contact_name,
      emergency_contact_phone: input.emergency_contact_phone,
      photo_consent: input.consents.includes('photo_video'),
      data_consent: input.consents.includes('data_processing'),
    })
    .select('id')
    .single();
  if (childError || !child) return { success: false, error: 'Could not register your child. Please try again.' };

  const { error: linkError } = await sb
    .from('parent_child_links')
    .insert({ parent_id: userId, child_id: child.id, relationship: input.relationship, is_primary: true });
  if (linkError) {
    // Without the link nobody could see or manage this record, so don't leave it behind
    await sb.from('child_profiles').delete().eq('id', child.id);
    return { success: false, error: 'Could not register your child. Please try again.' };
  }

  if (input.consents.length > 0) {
    // A failure here leaves the child registered with consents still off, which the parent
    // can see and switch on from the child's screen, so it does not undo the registration
    await sb.from('consent_records').insert(
      input.consents.map((consent_type) => ({
        child_id: child.id,
        parent_id: userId,
        consent_type,
        action: 'granted',
        ip_address: meta.ip_address ?? null,
        user_agent: meta.user_agent ?? null,
      })),
    );
  }

  return { success: true, data: { id: child.id as string } };
}
