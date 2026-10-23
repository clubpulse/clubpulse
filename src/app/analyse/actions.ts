'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { insertDemoHighlight } from '@/lib/highlights-demo';

// Dev-only shortcut behind "Skip to highlights (dev)". Server actions are reachable by POST in any
// build, so this checks NODE_ENV itself rather than relying on the button being hidden.
export async function seedDemoHighlights() {
  if (process.env.NODE_ENV !== 'development') throw new Error('Only available in development');
  const user = await getCurrentUser();
  if (!user) redirect('/auth/sign-in?redirectTo=/analyse');

  // The user's own session is enough: RLS allows inserting your own highlights
  const { error } = await insertDemoHighlight(await createClient(), user.id);
  if (error) throw new Error(`Couldn’t seed highlights: ${error.message}`);
  redirect('/highlights');
}
