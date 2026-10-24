'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { WellbeingCheckin, WellbeingAggregate } from '@/lib/types/wellbeing';

function thisWeekDate(): string {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export async function submitCheckin(
  clubId: string,
  physicalRating: number,
  mentalRating: number,
  notes?: string,
) {
  const user = await requireUser();
  const supabase = await createClient();

  const check_week = thisWeekDate();

  const { error } = await supabase.from('wellbeing_checkins').upsert(
    {
      user_id: user.id,
      club_id: clubId,
      check_week,
      physical_rating: physicalRating,
      mental_rating: mentalRating,
      notes: notes ?? null,
    },
    { onConflict: 'user_id,club_id,check_week' },
  );

  if (error) return { success: false as const, error: error.message };

  revalidatePath('/wellbeing');
  return { success: true as const };
}

export async function getMyCheckins(clubId: string, weeks = 8) {
  const user = await requireUser();
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  const sinceStr = since.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('wellbeing_checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('club_id', clubId)
    .gte('check_week', sinceStr)
    .order('check_week', { ascending: false });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: (data ?? []) as WellbeingCheckin[] };
}

export async function getThisWeeksCheckin(clubId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const check_week = thisWeekDate();

  const { data, error } = await supabase
    .from('wellbeing_checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('club_id', clubId)
    .eq('check_week', check_week)
    .maybeSingle();

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data as WellbeingCheckin | null };
}

export async function getWellbeingAggregate(clubId: string, weeks = 4) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_wellbeing_aggregate', {
    p_club_id: clubId,
    p_weeks: weeks,
  });

  if (error) return { success: false as const, error: error.message };
  if (!data?.ok) return { success: false as const, error: data?.error ?? 'rpc_failed' };

  return { success: true as const, data: (data.data ?? []) as WellbeingAggregate[] };
}
