// Server-only. Renders one role's page for the signed-in person.

import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { fetchProfile } from '@/lib/profile/service';
import { getAudience } from '@/lib/nav/audience';
import type { Role } from '@/lib/nav/menu';
import { ROLE_PAGES, holdsRole, rolePagesFor, roleTools } from '@/lib/nav/role-pages';
import { getRoleData } from '@/lib/roles/data';
import { RoleNotHeld, RolePageView } from '@/components/roles/RolePageView';

export async function renderRolePage(role: Role) {
  const user = await requireUser();
  const audience = await getAudience(user.id);
  const page = ROLE_PAGES[role];
  if (!holdsRole(audience, role)) return <RoleNotHeld page={page} />;

  const supabase = await createClient();
  const [profile, data] = await Promise.all([fetchProfile(supabase, user.id), getRoleData(role, user.id)]);
  const name = profile.success
    ? (profile.data.display_name || profile.data.full_name || 'You').split(' ')[0]
    : user.email?.split('@')[0] ?? 'You';

  return <RolePageView page={page} pages={rolePagesFor(audience)} name={name} data={data} tools={roleTools(role, audience)} />;
}
