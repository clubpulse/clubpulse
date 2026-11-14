import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

// Roles a person may pick for themselves at sign-up. club_admin and merchant are never
// self-assigned: sign-up metadata is user-controlled, so it is filtered here.
const SELF_SERVE_ROLES = ['player', 'volunteer', 'parent', 'coach'] as const;

// Creates the profile row and role rows for a verified user if they don't exist yet.
// Idempotent, so it's safe to call on every sign-in callback. Needed because with email
// confirmation on there is no session at sign-up time to create them with.
export async function ensureProfileAndRoles(user: User): Promise<void> {
  const admin = createAdminClient();
  const meta = (user.user_metadata ?? {}) as { full_name?: unknown; name?: unknown; roles?: unknown };

  const rawName = typeof meta.full_name === 'string' ? meta.full_name : typeof meta.name === 'string' ? meta.name : '';
  const fullName = rawName.trim().slice(0, 100) || user.email?.split('@')[0] || 'Athlete';

  await admin.from('profiles').upsert(
    {
      id: user.id,
      full_name: fullName,
      display_name: fullName.split(' ')[0],
      email: user.email ?? '',
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  const { data: existing } = await admin.from('user_roles').select('id').eq('user_id', user.id).limit(1);
  if ((existing ?? []).length > 0) return;

  const requested = Array.isArray(meta.roles) ? meta.roles : [];
  const roles = [...new Set(requested.filter((r): r is (typeof SELF_SERVE_ROLES)[number] =>
    (SELF_SERVE_ROLES as readonly unknown[]).includes(r)
  ))];
  if (roles.length === 0) roles.push('player');

  await admin
    .from('user_roles')
    .insert(roles.map((role, index) => ({ user_id: user.id, role, is_primary: index === 0 })));
}
