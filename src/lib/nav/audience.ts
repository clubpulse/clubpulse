// Server-only. Looks up who is signed in so the menu and Home can be shaped for them.
import { cache } from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildAudience, type Audience } from '@/lib/nav/menu';

export const getAudience = cache(async (userId: string): Promise<Audience> => {
  const admin = createAdminClient();
  const [{ data: roles }, { data: memberships }] = await Promise.all([
    admin.from('user_roles').select('role').eq('user_id', userId),
    admin.from('club_members').select('role, is_junior, is_active').eq('user_id', userId),
  ]);
  const active = (memberships ?? []).filter((m) => m.is_active !== false);
  return buildAudience({
    userRoles: (roles ?? []).map((r) => r.role as string),
    memberRoles: active.map((m) => m.role as string),
    junior: active.length > 0 && active.every((m) => m.is_junior === true),
    admin: active.some((m) => m.role === 'club_admin'),
  });
});
