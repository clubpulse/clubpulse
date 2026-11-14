import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActionResult } from '@/lib/types/action';
import type { ScoresWallet } from '@/lib/types/scores';
import type { UserProfile } from '@/lib/types/user';

export type ProfileUpdate = { full_name?: string; display_name?: string };

const PROFILE_FIELDS = 'id, full_name, display_name, email, primary_sport, is_active, onboarding_complete';

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<ActionResult<UserProfile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', userId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Profile not found' };
  return { success: true, data: data as UserProfile };
}

export async function fetchWallet(
  supabase: SupabaseClient,
  userId: string
): Promise<ActionResult<ScoresWallet | null>> {
  const { data, error } = await supabase
    .from('creds_wallet')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data as ScoresWallet | null) ?? null };
}

// Whitelist: only these two fields can ever be changed through the profile API
export function parseProfileUpdate(body: unknown): ActionResult<ProfileUpdate> {
  if (typeof body !== 'object' || body === null) {
    return { success: false, error: 'Invalid request body' };
  }
  const input = body as Record<string, unknown>;
  const update: ProfileUpdate = {};

  if (input.full_name !== undefined) {
    const value = typeof input.full_name === 'string' ? input.full_name.trim() : '';
    if (value.length < 1 || value.length > 100) {
      return { success: false, error: 'Full name must be 1-100 characters' };
    }
    update.full_name = value;
  }

  if (input.display_name !== undefined) {
    const value = typeof input.display_name === 'string' ? input.display_name.trim() : '';
    if (value.length < 1 || value.length > 40) {
      return { success: false, error: 'Display name must be 1-40 characters' };
    }
    update.display_name = value;
  }

  if (Object.keys(update).length === 0) {
    return { success: false, error: 'Nothing to update' };
  }
  return { success: true, data: update };
}

export async function applyProfileUpdate(
  supabase: SupabaseClient,
  userId: string,
  body: unknown
): Promise<ActionResult<UserProfile>> {
  const parsed = parseProfileUpdate(body);
  if (!parsed.success) return parsed;

  const { data, error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', userId)
    .select(PROFILE_FIELDS)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'Profile not found' };
  return { success: true, data: data as UserProfile };
}
