import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPlausibleDob } from '@/lib/community/age';

// Roles a person may pick for themselves at sign-up. club_admin and merchant are never
// self-assigned: sign-up metadata is user-controlled, so it is filtered here.
const SELF_SERVE_ROLES = ['player', 'volunteer', 'parent', 'coach'] as const;

/**
 * Copies a plausible date of birth from the sign-up metadata onto the profile when it has none. The database trigger
 * may have made the profile without one, and someone who signs in with a password after confirming in a different
 * browser never reaches the callback. Never overwrites: a date that is already saved decides who is a junior.
 */
export async function backfillDateOfBirth(user: User): Promise<void> {
  const dob = (user.user_metadata as { date_of_birth?: unknown } | null | undefined)?.date_of_birth;
  if (!isPlausibleDob(dob)) return;
  await createAdminClient().from('profiles').update({ date_of_birth: dob }).eq('id', user.id).is('date_of_birth', null);
}

// Creates the profile row and role rows for a verified user if they don't exist yet.
// Idempotent, so it's safe to call on every sign-in callback. Needed because with email
// confirmation on there is no session at sign-up time to create them with.
export async function ensureProfileAndRoles(user: User): Promise<void> {
  const admin = createAdminClient();
  const meta = (user.user_metadata ?? {}) as { full_name?: unknown; name?: unknown; roles?: unknown; date_of_birth?: unknown };

  const rawName = typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : '';
  const fullName = rawName.trim().slice(0, 100) || user.email?.split('@')[0] || 'Athlete';

  // Mirrors ensure_profile_and_roles() in supabase/migrations/20261122000011_profile_on_signup.sql
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: user.id,
      full_name: fullName,
      display_name: fullName.split(' ')[0],
      email: user.email ?? '',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );
  if (profileError) throw new Error(`Could not create the profile: ${profileError.message}`);

  await backfillDateOfBirth(user);

  const { data: existing } = await admin.from('user_roles').select('id').eq('user_id', user.id).limit(1);
  if ((existing ?? []).length > 0) return;

  const requested = Array.isArray(meta.roles) ? meta.roles : [];
  const roles = [...new Set(requested.filter((r): r is (typeof SELF_SERVE_ROLES)[number] =>
    (SELF_SERVE_ROLES as readonly unknown[]).includes(r)
  ))];
  if (roles.length === 0) roles.push('player');

  const { error: roleError } = await admin
    .from('user_roles')
    .insert(roles.map((role, index) => ({ user_id: user.id, role, is_primary: index === 0 })));
  if (roleError) throw new Error(`Could not create the roles: ${roleError.message}`);
}

/** Supabase's message when a PKCE link is opened without the browser storage that started it (a different browser). */
export function isMissingVerifier(detail: string): boolean {
  return /code verifier/i.test(detail) || /pkce/i.test(detail);
}
