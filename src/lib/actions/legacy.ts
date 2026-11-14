'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/auth/admin';
import type { ActionResult } from '@/lib/types/action';
import type { PlayerLegacy } from '@/lib/types/legacy';

// ── Public / player ──────────────────────────────────────────────────────────

/** Published legacies for a club — used on the Hall of Fame wall. */
export async function getClubLegacies(clubId: string): Promise<ActionResult<PlayerLegacy[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('player_legacy')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_published', true)
    .order('inducted_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as PlayerLegacy[] };
}

/** The calling user's own legacy entry (draft or published). */
export async function getMyLegacy(clubId: string): Promise<ActionResult<PlayerLegacy | null>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('player_legacy')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as PlayerLegacy | null };
}

// ── Admin ─────────────────────────────────────────────────────────────────────

async function requireClubAdmin(clubId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const ctx = await getAdminContext(user.id);
  if (!ctx.adminClubIds.includes(clubId)) throw new Error('Not a club admin');
  return { supabase, user };
}

/** All legacy entries for a club including drafts — admin only. */
export async function adminGetAllLegacies(clubId: string): Promise<ActionResult<PlayerLegacy[]>> {
  try {
    const { supabase } = await requireClubAdmin(clubId);
    const { data, error } = await supabase
      .from('player_legacy')
      .select('*')
      .eq('club_id', clubId)
      .order('inducted_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as PlayerLegacy[] };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export type UpsertLegacyInput = Omit<PlayerLegacy, 'id' | 'inducted_at'> & { id?: string };

/** Create or update a legacy entry (upsert by user_id + club_id). */
export async function adminUpsertLegacy(input: UpsertLegacyInput): Promise<ActionResult<PlayerLegacy>> {
  try {
    const { supabase } = await requireClubAdmin(input.club_id);

    const payload = {
      user_id:          input.user_id,
      club_id:          input.club_id,
      display_name:     input.display_name,
      nickname:         input.nickname ?? null,
      years_at_club:    input.years_at_club,
      primary_role:     input.primary_role,
      career_summary:   input.career_summary,
      career_highlight: input.career_highlight ?? null,
      best_season:      input.best_season ?? null,
      total_matches:    input.total_matches ?? null,
      total_runs:       input.total_runs ?? null,
      total_wickets:    input.total_wickets ?? null,
      honours:          input.honours ?? null,
      quote:            input.quote ?? null,
      photo_url:        input.photo_url ?? null,
      status:           input.status,
      is_published:     input.is_published,
    };

    const { data, error } = await supabase
      .from('player_legacy')
      .upsert(payload, { onConflict: 'user_id,club_id' })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as PlayerLegacy };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Publish a legacy entry by id. */
export async function adminPublishLegacy(id: string, clubId: string): Promise<ActionResult<void>> {
  try {
    const { supabase } = await requireClubAdmin(clubId);
    const { error } = await supabase
      .from('player_legacy')
      .update({ is_published: true })
      .eq('id', id)
      .eq('club_id', clubId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Unpublish a legacy entry by id. */
export async function adminUnpublishLegacy(id: string, clubId: string): Promise<ActionResult<void>> {
  try {
    const { supabase } = await requireClubAdmin(clubId);
    const { error } = await supabase
      .from('player_legacy')
      .update({ is_published: false })
      .eq('id', id)
      .eq('club_id', clubId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
