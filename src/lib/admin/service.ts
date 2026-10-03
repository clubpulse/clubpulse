import { createAdminClient } from '@/lib/supabase/admin';
import { isClubAdmin, isPlatformAdmin } from '@/lib/auth/admin';
import { isUuid } from '@/lib/utils/validate';
import type { DynamicMultiplier } from '@/lib/ai/dynamic-scores';
import type { ActionResult } from '@/lib/types/action';
import type { Club, ClubMember, ClubMemberRole, ClubMemberWithProfile } from '@/lib/types/club';
import type { EarningRules, SportConfig } from '@/lib/types/sport';
import type { VolunteerSession, VolunteerSessionWithName, VolunteerStatus } from '@/lib/types/volunteer';

// Every function takes the verified caller id and re-checks club-admin rights itself, because
// server actions and API routes are public endpoints and these run with the service role.

const FORBIDDEN = 'You do not have access to this club';
const MEMBER_ROLES: ClubMemberRole[] = ['member', 'admin', 'coach', 'volunteer'];
const CONDITION_TYPES = ['weather', 'scarcity', 'season_phase', 'manual'] as const;

async function requireClubAdmin(userId: string, clubId: string): Promise<string | null> {
  if (!isUuid(clubId) || !(await isClubAdmin(userId, clubId))) return FORBIDDEN;
  return null;
}

async function profileNames(userIds: string[]) {
  const names = new Map<string, { full_name: string | null; display_name: string | null }>();
  if (userIds.length === 0) return names;
  // Only names are exposed to club admins, never email
  const { data } = await createAdminClient()
    .from('profiles')
    .select('id, full_name, display_name')
    .in('id', userIds);
  for (const p of data ?? []) names.set(p.id, { full_name: p.full_name, display_name: p.display_name });
  return names;
}

// ── Overview ───────────────────────────────────────────────────────────────

export type ClubOverview = {
  club:              Club | null;
  memberCount:       number;
  pendingVolunteers: number;
  activeMultipliers: number;
};

export async function getClubOverview(userId: string, clubId: string): Promise<ActionResult<ClubOverview>> {
  const denied = await requireClubAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const [club, members, pending, multipliers] = await Promise.all([
    admin.from('clubs').select('*').eq('id', clubId).maybeSingle(),
    admin.from('club_members').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('is_active', true),
    admin.from('volunteer_sessions').select('id', { count: 'exact', head: true }).eq('club_id', clubId).eq('club_confirmed', false).eq('status', 'pending'),
    admin.from('dynamic_multipliers').select('active_until').eq('club_id', clubId).lte('active_from', now),
  ]);

  const activeMultipliers = (multipliers.data ?? []).filter(
    (m) => m.active_until === null || Date.parse(m.active_until) > Date.now()
  ).length;

  return {
    success: true,
    data: {
      club: (club.data as Club | null) ?? null,
      memberCount: members.count ?? 0,
      pendingVolunteers: pending.count ?? 0,
      activeMultipliers,
    },
  };
}

// ── Members ────────────────────────────────────────────────────────────────

export async function listClubMembers(userId: string, clubId: string): Promise<ActionResult<ClubMemberWithProfile[]>> {
  const denied = await requireClubAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  const { data, error } = await createAdminClient()
    .from('club_members')
    .select('*')
    .eq('club_id', clubId)
    .order('joined_at', { ascending: false });
  if (error) return { success: false, error: 'Could not load members' };

  const members = (data ?? []) as ClubMember[];
  const names = await profileNames(members.map((m) => m.user_id));
  return {
    success: true,
    data: members.map((m) => ({
      ...m,
      full_name: names.get(m.user_id)?.full_name ?? null,
      display_name: names.get(m.user_id)?.display_name ?? null,
    })),
  };
}

export async function getClubMember(userId: string, memberId: string): Promise<ActionResult<ClubMemberWithProfile>> {
  if (!isUuid(memberId)) return { success: false, error: 'Member not found' };

  const { data } = await createAdminClient().from('club_members').select('*').eq('id', memberId).maybeSingle();
  const member = data as ClubMember | null;
  // Same message for missing and forbidden so member ids can't be probed
  if (!member || (await requireClubAdmin(userId, member.club_id))) {
    return { success: false, error: 'Member not found' };
  }

  const names = await profileNames([member.user_id]);
  return {
    success: true,
    data: {
      ...member,
      full_name: names.get(member.user_id)?.full_name ?? null,
      display_name: names.get(member.user_id)?.display_name ?? null,
    },
  };
}

export async function updateClubMember(
  userId: string,
  memberId: string,
  patch: unknown
): Promise<ActionResult<ClubMember>> {
  const found = await getClubMember(userId, memberId);
  if (!found.success) return found;
  const member = found.data;

  if (typeof patch !== 'object' || patch === null) return { success: false, error: 'Invalid request body' };
  const input = patch as Record<string, unknown>;
  const update: { role?: ClubMemberRole; is_active?: boolean } = {};

  if (input.role !== undefined) {
    if (!MEMBER_ROLES.includes(input.role as ClubMemberRole)) {
      return { success: false, error: `Role must be one of: ${MEMBER_ROLES.join(', ')}` };
    }
    update.role = input.role as ClubMemberRole;
  }
  if (input.is_active !== undefined) {
    if (typeof input.is_active !== 'boolean') return { success: false, error: 'is_active must be true or false' };
    update.is_active = input.is_active;
  }
  if (Object.keys(update).length === 0) return { success: false, error: 'Nothing to update' };

  const admin = createAdminClient();

  // Never leave a club with no active admin
  const losesAdmin =
    member.role === 'admin' && member.is_active &&
    ((update.role !== undefined && update.role !== 'admin') || update.is_active === false);
  if (losesAdmin) {
    const { count } = await admin
      .from('club_members')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', member.club_id)
      .eq('role', 'admin')
      .eq('is_active', true)
      .neq('id', member.id);
    if (!count) return { success: false, error: 'A club needs at least one active admin' };
  }

  const { data, error } = await admin.from('club_members').update(update).eq('id', memberId).select('*').maybeSingle();
  if (error || !data) return { success: false, error: 'Could not update member' };
  return { success: true, data: data as ClubMember };
}

// ── Volunteer sessions ─────────────────────────────────────────────────────

export async function listVolunteerSessions(
  userId: string,
  clubId: string,
  status?: VolunteerStatus
): Promise<ActionResult<VolunteerSessionWithName[]>> {
  const denied = await requireClubAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  let query = createAdminClient()
    .from('volunteer_sessions')
    .select('*')
    .eq('club_id', clubId)
    .order('session_date', { ascending: false })
    .limit(200);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return { success: false, error: 'Could not load volunteer sessions' };

  const sessions = (data ?? []) as VolunteerSession[];
  const names = await profileNames([...new Set(sessions.map((s) => s.user_id))]);
  return {
    success: true,
    data: sessions.map((s) => ({
      ...s,
      volunteer_name: names.get(s.user_id)?.display_name ?? names.get(s.user_id)?.full_name ?? null,
    })),
  };
}

// ── Multipliers ────────────────────────────────────────────────────────────

export async function listMultipliers(userId: string, clubId: string): Promise<ActionResult<DynamicMultiplier[]>> {
  const denied = await requireClubAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  const { data, error } = await createAdminClient()
    .from('dynamic_multipliers')
    .select('*')
    .eq('club_id', clubId)
    .order('active_from', { ascending: false });
  if (error) return { success: false, error: 'Could not load multipliers' };

  return {
    success: true,
    data: ((data ?? []) as DynamicMultiplier[]).map((m) => ({ ...m, multiplier: Number(m.multiplier) })),
  };
}

export type MultiplierInput = {
  name:           string;
  multiplier:     number;
  condition_type: (typeof CONDITION_TYPES)[number];
  condition_data?: Record<string, unknown>;
  active_from?:   string;
  active_until?:  string | null;
};

// Club-scoped only. Platform-wide multipliers (club_id NULL) are created with the service role.
export async function createMultiplier(
  userId: string,
  clubId: string,
  input: MultiplierInput
): Promise<ActionResult<DynamicMultiplier>> {
  const denied = await requireClubAdmin(userId, clubId);
  if (denied) return { success: false, error: denied };

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (name.length < 1 || name.length > 80) return { success: false, error: 'Name must be 1-80 characters' };
  if (typeof input.multiplier !== 'number' || !(input.multiplier >= 0.1 && input.multiplier <= 5)) {
    return { success: false, error: 'Multiplier must be between 0.1 and 5' };
  }
  if (!CONDITION_TYPES.includes(input.condition_type)) {
    return { success: false, error: `Condition must be one of: ${CONDITION_TYPES.join(', ')}` };
  }

  const activeFrom = input.active_from ? new Date(input.active_from) : new Date();
  if (Number.isNaN(activeFrom.getTime())) return { success: false, error: 'Invalid start date' };
  let activeUntil: Date | null = null;
  if (input.active_until) {
    activeUntil = new Date(input.active_until);
    if (Number.isNaN(activeUntil.getTime()) || activeUntil <= activeFrom) {
      return { success: false, error: 'End date must be after the start date' };
    }
  }

  const { data, error } = await createAdminClient()
    .from('dynamic_multipliers')
    .insert({
      club_id:        clubId,
      name,
      multiplier:     Math.round(input.multiplier * 100) / 100,
      condition_type: input.condition_type,
      condition_data: input.condition_data ?? {},
      active_from:    activeFrom.toISOString(),
      active_until:   activeUntil?.toISOString() ?? null,
      created_by:     userId,
    })
    .select('*')
    .single();
  if (error) return { success: false, error: 'Could not create multiplier' };
  return { success: true, data: { ...(data as DynamicMultiplier), multiplier: Number(data.multiplier) } };
}

export async function endMultiplier(userId: string, multiplierId: string): Promise<ActionResult<null>> {
  if (!isUuid(multiplierId)) return { success: false, error: 'Multiplier not found' };

  const admin = createAdminClient();
  const { data } = await admin.from('dynamic_multipliers').select('id, club_id').eq('id', multiplierId).maybeSingle();
  if (!data?.club_id || (await requireClubAdmin(userId, data.club_id))) {
    return { success: false, error: 'Multiplier not found' };
  }

  const { error } = await admin
    .from('dynamic_multipliers')
    .update({ active_until: new Date().toISOString() })
    .eq('id', multiplierId);
  if (error) return { success: false, error: 'Could not end multiplier' };
  return { success: true, data: null };
}

// ── Sport configs (global, so platform admins only) ────────────────────────

const RULE_CATEGORIES = ['performance', 'participation', 'volunteering', 'organisation'] as const;

export function validateEarningRules(value: unknown): ActionResult<EarningRules> {
  if (typeof value !== 'object' || value === null) return { success: false, error: 'earning_rules must be an object' };
  const input = value as Record<string, unknown>;
  const rules: Record<string, Record<string, number>> = {};

  for (const category of RULE_CATEGORIES) {
    const group = input[category] ?? {};
    if (typeof group !== 'object' || group === null || Array.isArray(group)) {
      return { success: false, error: `${category} must be an object of metric: Scores` };
    }
    rules[category] = {};
    for (const [metric, scores] of Object.entries(group)) {
      if (!/^[a-z0-9_]{1,40}$/.test(metric)) {
        return { success: false, error: `Invalid metric name "${metric}" (lowercase letters, numbers, _)` };
      }
      if (typeof scores !== 'number' || !Number.isInteger(scores) || scores < 0 || scores > 1000) {
        return { success: false, error: `${category}.${metric} must be a whole number from 0 to 1000` };
      }
      rules[category][metric] = scores;
    }
  }
  return { success: true, data: rules as EarningRules };
}

export async function listSportConfigs(): Promise<ActionResult<SportConfig[]>> {
  const { data, error } = await createAdminClient().from('sport_configs').select('*').order('display_name');
  if (error) return { success: false, error: 'Could not load sport configs' };
  return { success: true, data: (data ?? []) as SportConfig[] };
}

export async function updateSportConfig(
  userId: string,
  id: string,
  earningRules: unknown,
  isActive?: unknown
): Promise<ActionResult<SportConfig>> {
  if (!isPlatformAdmin(userId)) return { success: false, error: 'Only platform admins can edit earning rules' };
  if (!isUuid(id)) return { success: false, error: 'Sport config not found' };

  const rules = validateEarningRules(earningRules);
  if (!rules.success) return rules;

  const update: { earning_rules: EarningRules; is_active?: boolean } = { earning_rules: rules.data };
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') return { success: false, error: 'is_active must be true or false' };
    update.is_active = isActive;
  }

  const { data, error } = await createAdminClient()
    .from('sport_configs')
    .update(update)
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error || !data) return { success: false, error: 'Could not update sport config' };
  return { success: true, data: data as SportConfig };
}
