import { cache } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { safeRedirect } from '@/lib/utils/redirect';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureProfileAndRoles } from '@/lib/auth/onboarding';

// Memoised per request, so layouts and pages can both call it without extra round trips.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Makes sure a signed-in person has a profile. Someone who confirms their email in a different browser from the
 * sign-up never reaches /auth/callback, which is where the profile used to be created, so password sign-in must
 * heal it. Once per request (cache), one cheap lookup when the profile exists, and a failure is logged, never thrown:
 * it must not stop the page from loading.
 */
export const ensureProfile = cache(async (user: User): Promise<void> => {
  try {
    const { data } = await createAdminClient().from('profiles').select('id').eq('id', user.id).maybeSingle();
    if (data) return;
    await ensureProfileAndRoles(user);
  } catch (e) {
    console.error('[auth] could not ensure profile:', e instanceof Error ? e.message : e);
  }
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const path = safeRedirect((await headers()).get('x-pathname'), '');
    redirect(path ? `/auth/sign-in?redirectTo=${encodeURIComponent(path)}` : '/auth/sign-in');
  }
  await ensureProfile(user);
  return user;
}
