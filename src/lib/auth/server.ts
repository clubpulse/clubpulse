import { cache } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { safeRedirect } from '@/lib/utils/redirect';
import { createClient } from '@/lib/supabase/server';

// Memoised per request, so layouts and pages can both call it without extra round trips.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const path = safeRedirect((await headers()).get('x-pathname'), '');
    redirect(path ? `/auth/sign-in?redirectTo=${encodeURIComponent(path)}` : '/auth/sign-in');
  }
  return user;
}
