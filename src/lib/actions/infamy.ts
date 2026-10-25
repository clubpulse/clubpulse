'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type { InfamyCategory, InfamyNomination, InfamyWinner } from '@/lib/types/infamy';

/** Active infamy categories for a club */
export async function getInfamyCategories(clubId: string): Promise<ActionResult<InfamyCategory[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('infamy_categories')
      .select('*')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as InfamyCategory[] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Nominations for a category in a given season, with vote counts */
export async function getNominationsForCategory(
  categoryId: string,
  season: number,
): Promise<ActionResult<InfamyNomination[]>> {
  try {
    const supabase = await createClient();

    const { data: nominations, error } = await supabase
      .from('infamy_nominations')
      .select(`
        *,
        infamy_categories!category_id (id, club_id, name, description, emoji, is_active, created_at),
        nominated_profile:profiles!nominated_user_id (full_name, avatar_url)
      `)
      .eq('category_id', categoryId)
      .eq('season', season)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    // Fetch vote counts per nomination
    const nomIds = (nominations ?? []).map((n: Record<string, unknown>) => n.id as string);
    let voteCounts: Record<string, number> = {};

    if (nomIds.length > 0) {
      const { data: votes } = await supabase
        .from('infamy_votes')
        .select('nomination_id')
        .in('nomination_id', nomIds);

      for (const v of votes ?? []) {
        const vid = (v as Record<string, unknown>).nomination_id as string;
        voteCounts[vid] = (voteCounts[vid] ?? 0) + 1;
      }
    }

    const result: InfamyNomination[] = (nominations ?? []).map((row: Record<string, unknown>) => {
      const cat = row.infamy_categories as InfamyCategory | null;
      const profile = row.nominated_profile as { full_name: string; avatar_url?: string } | null;
      return {
        id: row.id as string,
        category_id: row.category_id as string,
        club_id: row.club_id as string,
        nominated_user_id: row.nominated_user_id as string,
        nominator_user_id: row.nominator_user_id as string,
        reason: row.reason as string,
        season: row.season as number,
        created_at: row.created_at as string,
        vote_count: voteCounts[row.id as string] ?? 0,
        category: cat ?? undefined,
        nominated_profile: profile ?? undefined,
      };
    });

    // Sort by vote count desc
    result.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0));

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Nominate a club member for an infamy category */
export async function nominateMember(
  categoryId: string,
  nominatedUserId: string,
  clubId: string,
  reason: string,
): Promise<ActionResult<InfamyNomination>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    if (user.id === nominatedUserId) {
      return { success: false, error: 'You cannot nominate yourself' };
    }

    if (!reason || reason.trim().length < 10) {
      return { success: false, error: 'Reason must be at least 10 characters' };
    }

    const season = new Date().getFullYear();

    const { data, error } = await supabase
      .from('infamy_nominations')
      .insert({
        category_id: categoryId,
        club_id: clubId,
        nominated_user_id: nominatedUserId,
        nominator_user_id: user.id,
        reason: reason.trim(),
        season,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as InfamyNomination };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Cast a vote for a nomination */
export async function voteForNomination(
  nominationId: string,
  clubId: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const season = new Date().getFullYear();

    const { data, error } = await supabase
      .from('infamy_votes')
      .insert({
        nomination_id: nominationId,
        voter_user_id: user.id,
        club_id: clubId,
        season,
      })
      .select('id')
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data: { id: (data as Record<string, unknown>).id as string } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Get the hall of infamy — past winners by season for a club */
export async function getHallOfInfamy(clubId: string): Promise<ActionResult<InfamyWinner[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('infamy_winners')
      .select(`
        *,
        infamy_categories!category_id (id, club_id, name, description, emoji, is_active, created_at),
        winner_profile:profiles!winner_user_id (full_name, avatar_url)
      `)
      .eq('club_id', clubId)
      .order('season', { ascending: false })
      .order('vote_count', { ascending: false });

    if (error) return { success: false, error: error.message };

    const result: InfamyWinner[] = (data ?? []).map((row: Record<string, unknown>) => {
      const cat = row.infamy_categories as InfamyCategory | null;
      const profile = row.winner_profile as { full_name: string; avatar_url?: string } | null;
      return {
        id: row.id as string,
        category_id: row.category_id as string,
        club_id: row.club_id as string,
        winner_user_id: row.winner_user_id as string,
        season: row.season as number,
        vote_count: row.vote_count as number,
        locked_at: row.locked_at as string,
        category: cat ?? undefined,
        winner_profile: profile ?? undefined,
      };
    });

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Nominations the current user has received this season */
export async function getMyNominations(
  userId: string,
  clubId: string,
  season: number,
): Promise<ActionResult<InfamyNomination[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('infamy_nominations')
      .select(`
        *,
        infamy_categories!category_id (id, club_id, name, description, emoji, is_active, created_at)
      `)
      .eq('nominated_user_id', userId)
      .eq('club_id', clubId)
      .eq('season', season)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const result: InfamyNomination[] = (data ?? []).map((row: Record<string, unknown>) => {
      const cat = row.infamy_categories as InfamyCategory | null;
      return {
        id: row.id as string,
        category_id: row.category_id as string,
        club_id: row.club_id as string,
        nominated_user_id: row.nominated_user_id as string,
        nominator_user_id: row.nominator_user_id as string,
        reason: row.reason as string,
        season: row.season as number,
        created_at: row.created_at as string,
        category: cat ?? undefined,
      };
    });

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Get the set of nomination IDs the current user has voted on (for a club/season) */
export async function getMyVotes(
  clubId: string,
  season: number,
): Promise<ActionResult<string[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('infamy_votes')
      .select('nomination_id')
      .eq('voter_user_id', user.id)
      .eq('club_id', clubId)
      .eq('season', season);

    if (error) return { success: false, error: error.message };
    const ids = (data ?? []).map((v: Record<string, unknown>) => v.nomination_id as string);
    return { success: true, data: ids };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Get club members (for the nominate dropdown) */
export async function getClubMembers(
  clubId: string,
): Promise<ActionResult<Array<{ user_id: string; full_name: string; avatar_url?: string }>>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('club_members')
      .select(`
        user_id,
        profiles!user_id (full_name, avatar_url)
      `)
      .eq('club_id', clubId);

    if (error) return { success: false, error: error.message };

    const members = (data ?? [])
      .map((row: Record<string, unknown>) => {
        const profile = row.profiles as { full_name: string; avatar_url?: string } | null;
        return {
          user_id: row.user_id as string,
          full_name: profile?.full_name ?? 'Unknown',
          avatar_url: profile?.avatar_url,
        };
      })
      .filter((m) => m.user_id !== user.id); // exclude self

    return { success: true, data: members };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
