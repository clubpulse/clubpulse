import { cache } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { safeRedirect } from '@/lib/utils/redirect';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { backfillDateOfBirth, ensureProfileAndRoles } from '@/lib/auth/onboarding';
import { ageVerificationEnabled } from '@/lib/age-verification/flag';
import { dobBlockPath } from '@/lib/age-verification/rules';

// Memoised per request, so layouts and pages can both call it without extra round trips.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Makes sure a signed-in person has a profile, and a date of birth where the sign-up recorded one. Someone who
 * confirms their email in a different browser from the sign-up never reaches /auth/callback, which is where the
 * profile used to be created, so password sign-in must heal it. Once per request (cache), one cheap lookup when
 * the profile is complete, and a failure is logged, never thrown: it must not stop the page from loading.
 * Says whether a date of birth is still missing, so the dashboard can ask for it.
 */
export const ensureProfile = cache(async (user: User): Promise<{ needsDob: boolean }> => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('profiles').select('id, date_of_birth').eq('id', user.id).maybeSingle();
    if (error) return { needsDob: ageVerificationEnabled() };
    if (!data) {
      await ensureProfileAndRoles(user);
    } else if (!data.date_of_birth) {
      await backfillDateOfBirth(user);
    } else {
      return { needsDob: false };
    }
    const { data: after } = await admin.from('profiles').select('date_of_birth').eq('id', user.id).maybeSingle();
    return { needsDob: !!after && !after.date_of_birth };
  } catch (e) {
    console.error('[auth] could not ensure profile:', e instanceof Error ? e.message : e);
    return { needsDob: ageVerificationEnabled() };
  }
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const path = safeRedirect((await headers()).get('x-pathname'), '');
    redirect(path ? `/auth/sign-in?redirectTo=${encodeURIComponent(path)}` : '/auth/sign-in');
  }
  const { needsDob } = await ensureProfile(user);
  const path = (await headers()).get('x-pathname') ?? '';
  const block = dobBlockPath(path, needsDob, ageVerificationEnabled());
  if (block) redirect(block);
  return user;
}
