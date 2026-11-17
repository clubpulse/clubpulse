// GET /api/profile/roles → { roles, club, juniors, approvalQueue }
// Everything the mobile app needs to decide which role sections to show.
// Auth: Bearer access token (Expo) or cookie session (web).
//
// Roles come from two places in the live schema:
//   user_roles          - roles a person holds on the platform (player, coach, parent, volunteer)
//   club_members.role   - their position in a club; the only source of club_admin
// A person has one club_members row per club, so several roles means user_roles plus that row.

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { listApprovals } from '@/lib/mobile/club-data';
import { unauthorized } from '@/lib/utils/http';

const APP_ROLES = ['player', 'coach', 'parent', 'volunteer', 'club_admin'] as const;
type AppRole = (typeof APP_ROLES)[number];
const isAppRole = (role: unknown): role is AppRole => (APP_ROLES as readonly unknown[]).includes(role);

function ageGroup(dateOfBirth: string | null): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())) age--;
  if (age >= 18) return 'Adult';
  // Cricket age groups are odd-numbered: U9, U11, U13, U15, U17, U19
  const under = age + 1;
  return `U${Math.max(9, under % 2 === 0 ? under + 1 : under)}`;
}

export async function GET(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  // Service role, scoped by hand to this user: user_roles has no client-readable policy
  const admin = createAdminClient();

  const [userRoles, memberships, links] = await Promise.all([
    admin.from('user_roles').select('role').eq('user_id', user.id),
    admin
      .from('club_members')
      .select('club_id, role, joined_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('joined_at', { ascending: true }),
    admin
      .from('parent_child_links')
      .select('id, verified_at, child_profiles ( id, first_name, last_name, date_of_birth, data_consent )')
      .eq('parent_id', user.id),
  ]);

  if (userRoles.error || memberships.error) {
    return NextResponse.json({ error: 'Could not load your roles' }, { status: 500 });
  }

  const members = memberships.data ?? [];
  const juniorLinks = links.error ? [] : (links.data ?? []);

  // club_admin is only ever granted through club_members, never self-assigned
  const held = new Set<AppRole>(['player']);
  for (const row of userRoles.data ?? []) if (isAppRole(row.role) && row.role !== 'club_admin') held.add(row.role);
  for (const row of members) if (isAppRole(row.role)) held.add(row.role);
  if (juniorLinks.length > 0) held.add('parent');

  const roles = APP_ROLES.filter((role) => held.has(role)).map((role) => ({
    role,
    status: 'approved' as const,
    granted_at: null,
  }));

  // The app shows one club: the admin club if there is one, otherwise the earliest joined
  const primary = members.find((m) => m.role === 'club_admin') ?? members[0] ?? null;
  let club: { id: string; name: string; subscription_tier: string | null; member_count: number } | null = null;
  if (primary) {
    // Looked up separately: club_members has no foreign key to clubs to embed through
    const [{ data: clubRow }, { count }, subscription] = await Promise.all([
      admin.from('clubs').select('name').eq('id', primary.club_id).maybeSingle(),
      admin.from('club_members').select('id', { count: 'exact', head: true }).eq('club_id', primary.club_id).eq('is_active', true),
      admin.from('club_subscriptions').select('tier').eq('club_id', primary.club_id).maybeSingle(),
    ]);
    club = {
      id: primary.club_id as string,
      name: (clubRow?.name as string | undefined) ?? 'Your club',
      subscription_tier: (subscription.data?.tier as string | undefined) ?? null,
      member_count: count ?? 0,
    };
  }

  const juniors = juniorLinks
    .map((link) => {
      const child = Array.isArray(link.child_profiles) ? link.child_profiles[0] : link.child_profiles;
      if (!child) return null;
      return {
        id: link.id as string,
        junior_id: child.id as string,
        full_name: `${child.first_name} ${child.last_name}`.trim(),
        date_of_birth: child.date_of_birth as string | null,
        age_group: ageGroup(child.date_of_birth as string | null),
        consent_given: !!child.data_consent,
        consent_date: null,
        link_status: link.verified_at ? ('approved' as const) : ('pending' as const),
      };
    })
    .filter((j) => j !== null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  // Unverified parent links and unapproved coaches, for club admins; empty for everyone else
  const approvalQueue = held.has('club_admin') ? await listApprovals(user.id) : [];
  return NextResponse.json({ roles, club, juniors, approvalQueue });
}
