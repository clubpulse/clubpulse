'use server';

import { createClient } from '@/lib/supabase/server';
import { applyProfileUpdate, fetchProfile, fetchWallet } from '@/lib/profile/service';
import type { ActionResult } from '@/lib/types/action';
import type { ScoresWallet } from '@/lib/types/scores';
import type { UserProfile } from '@/lib/types/user';

export async function getProfile(): Promise<ActionResult<UserProfile>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  return fetchProfile(supabase, user.id);
}

export async function updateProfile(input: {
  full_name?: string;
  display_name?: string;
}): Promise<ActionResult<UserProfile>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  return applyProfileUpdate(supabase, user.id, input);
}

export async function getUserWallet(): Promise<ActionResult<ScoresWallet | null>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  return fetchWallet(supabase, user.id);
}
