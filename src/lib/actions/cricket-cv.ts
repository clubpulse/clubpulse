'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { ActionResult } from '@/lib/types/action';
import type { CricketCVProfile, CVSeasonStats, FullCricketCV } from '@/lib/types/cricket-cv';

// ---------------------------------------------------------------------------
// Read: current user's full CV
// ---------------------------------------------------------------------------
export async function getMyCricketCV(): Promise<ActionResult<FullCricketCV>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile, error: profileErr } = await supabase
    .from('cricket_cv_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileErr) return { success: false, error: profileErr.message };

  const { data: seasonStats } = await supabase
    .from('cv_season_stats')
    .select('*')
    .eq('user_id', user.id)
    .order('season', { ascending: false });

  // Badges (table may not exist yet)
  let badges: FullCricketCV['badges'] = [];
  try {
    const { data } = await supabase
      .from('player_badges')
      .select('awarded_at, badges(name, emoji, rarity)')
      .eq('user_id', user.id);
    if (data) {
      badges = (data as unknown as Array<{ awarded_at: string; badges: { name: string; emoji: string; rarity: string } | null }>).map((r) => ({
        name: r.badges?.name ?? '',
        emoji: r.badges?.emoji ?? '',
        rarity: r.badges?.rarity ?? '',
        awarded_at: r.awarded_at,
      }));
    }
  } catch {
    // badges feature not yet live
  }

  // Qualifications (table may not exist yet)
  let qualifications: FullCricketCV['qualifications'] = [];
  try {
    const { data } = await supabase
      .from('member_qualifications')
      .select('completed_date, is_verified, ecb_course_types(name, category)')
      .eq('user_id', user.id);
    if (data) {
      qualifications = (data as unknown as Array<{ completed_date: string; is_verified: boolean; ecb_course_types: { name: string; category: string } | null }>).map((r) => ({
        name: r.ecb_course_types?.name ?? '',
        category: r.ecb_course_types?.category ?? '',
        completed_date: r.completed_date,
        is_verified: r.is_verified,
      }));
    }
  } catch {
    // ECB courses feature not yet live
  }

  // Current club
  const { data: membership } = await supabase
    .from('club_members')
    .select('clubs(name)')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();
  const currentClub = (membership as { clubs: { name: string } | null } | null)?.clubs?.name;

  return {
    success: true,
    data: {
      profile: profile ?? ({
        id: '',
        user_id: user.id,
        is_public: false,
        show_badges: true,
        show_qualifications: true,
        show_scores_balance: false,
        updated_at: new Date().toISOString(),
      } as CricketCVProfile),
      seasonStats: (seasonStats ?? []) as CVSeasonStats[],
      badges,
      qualifications,
      currentClub: currentClub ?? undefined,
    },
  };
}

// ---------------------------------------------------------------------------
// Write: upsert profile
// ---------------------------------------------------------------------------
export async function upsertCVProfile(
  data: Partial<Omit<CricketCVProfile, 'id' | 'user_id' | 'share_slug' | 'updated_at'>>
): Promise<ActionResult<CricketCVProfile>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: updated, error } = await supabase
    .from('cricket_cv_profiles')
    .upsert(
      { ...data, user_id: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: updated as CricketCVProfile };
}

// ---------------------------------------------------------------------------
// Write: toggle public — auto-generate slug on first publish
// ---------------------------------------------------------------------------
export async function togglePublic(isPublic: boolean): Promise<ActionResult<CricketCVProfile>> {
  const user = await requireUser();
  const supabase = await createClient();

  // Fetch current profile to check if slug already exists
  const { data: existing } = await supabase
    .from('cricket_cv_profiles')
    .select('share_slug, display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  let shareSlug = existing?.share_slug;

  if (isPublic && !shareSlug) {
    const displayName = (existing as { display_name?: string } | null)?.display_name ?? `player-${user.id.slice(0, 8)}`;
    const { data: slugData, error: slugErr } = await supabase.rpc('generate_cv_slug', {
      p_display_name: displayName,
    });
    if (slugErr) return { success: false, error: slugErr.message };
    shareSlug = slugData as string;
  }

  const { data: updated, error } = await supabase
    .from('cricket_cv_profiles')
    .upsert(
      {
        user_id: user.id,
        is_public: isPublic,
        share_slug: shareSlug,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: updated as CricketCVProfile };
}

// ---------------------------------------------------------------------------
// Season stats CRUD
// ---------------------------------------------------------------------------
export async function addSeasonStats(
  data: Omit<CVSeasonStats, 'id' | 'user_id'>
): Promise<ActionResult<CVSeasonStats>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: inserted, error } = await supabase
    .from('cv_season_stats')
    .insert({ ...data, user_id: user.id })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: inserted as CVSeasonStats };
}

export async function deleteSeasonStats(id: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('cv_season_stats')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

// ---------------------------------------------------------------------------
// Public CV fetch (no auth required)
// ---------------------------------------------------------------------------
export async function getPublicCV(slug: string): Promise<ActionResult<FullCricketCV>> {
  // Use anon client — RLS policies handle access
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('cricket_cv_profiles')
    .select('*')
    .eq('share_slug', slug)
    .eq('is_public', true)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!profile) return { success: false, error: 'not_found' };

  const cvProfile = profile as CricketCVProfile;

  const { data: seasonStats } = await supabase
    .from('cv_season_stats')
    .select('*')
    .eq('user_id', cvProfile.user_id)
    .order('season', { ascending: false });

  let badges: FullCricketCV['badges'] = [];
  if (cvProfile.show_badges) {
    try {
      const { data } = await supabase
        .from('player_badges')
        .select('awarded_at, badges(name, emoji, rarity)')
        .eq('user_id', cvProfile.user_id);
      if (data) {
        badges = (data as unknown as Array<{ awarded_at: string; badges: { name: string; emoji: string; rarity: string } | null }>).map((r) => ({
          name: r.badges?.name ?? '',
          emoji: r.badges?.emoji ?? '',
          rarity: r.badges?.rarity ?? '',
          awarded_at: r.awarded_at,
        }));
      }
    } catch {
      // badges not yet live
    }
  }

  let qualifications: FullCricketCV['qualifications'] = [];
  if (cvProfile.show_qualifications) {
    try {
      const { data } = await supabase
        .from('member_qualifications')
        .select('completed_date, is_verified, ecb_course_types(name, category)')
        .eq('user_id', cvProfile.user_id);
      if (data) {
        qualifications = (data as unknown as Array<{ completed_date: string; is_verified: boolean; ecb_course_types: { name: string; category: string } | null }>).map((r) => ({
          name: r.ecb_course_types?.name ?? '',
          category: r.ecb_course_types?.category ?? '',
          completed_date: r.completed_date,
          is_verified: r.is_verified,
        }));
      }
    } catch {
      // ECB courses not yet live
    }
  }

  const { data: membership } = await supabase
    .from('club_members')
    .select('clubs(name)')
    .eq('user_id', cvProfile.user_id)
    .limit(1)
    .maybeSingle();
  const currentClub = (membership as { clubs: { name: string } | null } | null)?.clubs?.name;

  return {
    success: true,
    data: {
      profile: cvProfile,
      seasonStats: (seasonStats ?? []) as CVSeasonStats[],
      badges,
      qualifications,
      currentClub: currentClub ?? undefined,
    },
  };
}

