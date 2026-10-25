import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/server';

// Authorisation lookups use the service role on purpose: they read only the caller's own
// (already verified) user id, and don't depend on RLS policies being present on these tables.

export type AdminContext = {
  adminClubIds:    string[];
  isMerchant:      boolean;
  isPlatformAdmin: boolean;
};

// Platform admins edit global config (e.g. sport earning rules). Set PLATFORM_ADMIN_USER_IDS to a
// comma-separated list of auth user ids.
export function isPlatformAdmin(userId: string): boolean {
  const ids = (process.env.PLATFORM_ADMIN_USER_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.includes(userId);
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

export async function isClubAdmin(userId: string, clubId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from('club_members')
    .select('id')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .eq('role', 'club_admin')
    .eq('is_active', true)
    .maybeSingle();
  return !!data;
}

export async function isMerchant(userId: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'merchant')
    .limit(1);
  return (data ?? []).length > 0;
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const { data } = await createAdminClient().from('user_roles').select('role').eq('user_id', userId);
  return (data ?? []).map((row) => row.role as string);
}

export async function getAdminContext(userId: string): Promise<AdminContext> {
  const [adminClubIds, merchant] = await Promise.all([
    getAdminClubIds(userId),
    isMerchant(userId),
  ]);
  return { adminClubIds, isMerchant: merchant, isPlatformAdmin: isPlatformAdmin(userId) };
}

// ClubPulse staff (profiles.role = 'admin') for the /admin dashboard. Separate from club admins
// (club_members) and from PLATFORM_ADMIN_USER_IDS, which gates editing global config.
export const getAdminSession = cache(async (): Promise<User | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await createAdminClient().from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role === 'admin' ? user : null;
});

// Call at the top of every /admin page and server action: layouts alone don't guard pages or actions.
export async function requireAdmin(): Promise<User> {
  const user = await getAdminSession();
  if (!user) redirect('/');
  return user;
}
