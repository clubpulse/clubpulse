'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type { FormRating, ClubFormGuideEntry } from '@/lib/types/form';

export async function getMyFormRating(
  userId: string,
  clubId: string,
): Promise<ActionResult<FormRating | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('form_ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('club_id', clubId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getClubFormGuide(
  clubId: string,
): Promise<ActionResult<ClubFormGuideEntry[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('form_ratings')
      .select(`
        *,
        profiles!user_id (
          full_name,
          display_name
        )
      `)
      .eq('club_id', clubId)
      .order('rating', { ascending: false });

    if (error) return { success: false, error: error.message };

    const entries: ClubFormGuideEntry[] = (data ?? []).map((row: Record<string, unknown>) => {
      const profile = row.profiles as { full_name: string; display_name: string } | null;
      return {
        user_id:        row.user_id as string,
        club_id:        row.club_id as string,
        rating:         row.rating as number,
        trend:          row.trend as ClubFormGuideEntry['trend'],
        last_5_scores:  (row.last_5_scores as number[]) ?? [],
        last_5_wickets: (row.last_5_wickets as number[]) ?? [],
        matches_played: row.matches_played as number,
        updated_at:     row.updated_at as string,
        full_name:      profile?.full_name ?? 'Unknown',
        display_name:   profile?.display_name ?? 'Unknown',
      };
    });

    return { success: true, data: entries };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function triggerFormRecalc(
  userId: string,
  clubId: string,
): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('recalculate_form', {
      p_user_id: userId,
      p_club_id: clubId,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
