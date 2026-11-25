'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth/server';
import { clubMemberPricingEnabled, normaliseClubCode } from '@/lib/billing/member-pricing';

async function resolveClubId(code: string): Promise<string | null> {
  const { data } = await createAdminClient().from('clubs').select('id').ilike('join_code', code).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Saves the club the player says they belong to. Confirmation by the club is separate. */
export async function assignClaimedClub(userId: string, raw: unknown): Promise<{ success: true; clubId: string | null } | { success: false; error: string }> {
  const admin = createAdminClient();
  const code = normaliseClubCode(raw);
  if (code === 'empty') {
    const { error } = await admin.from('profiles').update({ claimed_club_id: null }).eq('id', userId);
    if (error) return { success: false, error: 'Could not update your club.' };
    return { success: true, clubId: null };
  }
  if (!code) return { success: false, error: 'Enter the club code your club gave you.' };
  const clubId = await resolveClubId(code);
  if (!clubId) return { success: false, error: 'That club is not registered with SHIFTUP, so the individual price applies.' };
  const { error } = await admin.from('profiles').update({ claimed_club_id: clubId }).eq('id', userId);
  if (error) return { success: false, error: 'Could not update your club.' };
  return { success: true, clubId };
}

export async function saveClaimedClub(raw: unknown): Promise<{ success: true; clubId: string | null } | { success: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Please sign in again.' };
  if (!clubMemberPricingEnabled()) return { success: false, error: 'Club member pricing is not open yet.' };
  return assignClaimedClub(user.id, raw);
}
