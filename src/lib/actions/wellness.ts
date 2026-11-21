'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { ukToday } from '@/lib/utils/uk-date';
import { validateReadiness, type ReadinessInput } from '@/lib/wellness/readiness';
import { ALL_CHECKLIST_ITEM_IDS } from '@/lib/wellness/content';
import type { ActionResult } from '@/lib/types/action';

export type WellnessToday = {
  date: string;
  readiness: (Required<Omit<ReadinessInput, 'notes'>> & { notes: string | null }) | null;
  ticks: string[];
};

const NOT_READY = 'Readiness check-ins are not switched on yet. Please try again soon.';

// A missing table (migration not run yet) must not crash the page.
function friendly(error: { code?: string; message?: string }): string {
  if (error.code === '42P01' || /does not exist|schema cache/i.test(error.message ?? '')) return NOT_READY;
  return 'Something went wrong. Please try again.';
}

export async function getWellnessToday(): Promise<ActionResult<WellnessToday>> {
  const user = await requireUser();
  const supabase = await createClient();
  const date = ukToday();
  const [r, t] = await Promise.all([
    supabase.from('wellness_readiness').select('sleep, mood, soreness, stress, notes').eq('user_id', user.id).eq('check_date', date).maybeSingle(),
    supabase.from('wellness_checklist_ticks').select('item_id').eq('user_id', user.id).eq('check_date', date),
  ]);
  if (r.error) return { success: false, error: friendly(r.error) };
  if (t.error) return { success: false, error: friendly(t.error) };
  return { success: true, data: { date, readiness: r.data ?? null, ticks: (t.data ?? []).map((x) => x.item_id as string) } };
}

export async function saveReadiness(input: unknown): Promise<ActionResult<null>> {
  const user = await requireUser();
  const v = validateReadiness(input);
  if (!v.ok) return { success: false, error: v.error };
  const supabase = await createClient();
  const { error } = await supabase.from('wellness_readiness').upsert(
    { user_id: user.id, check_date: ukToday(), ...v.value },
    { onConflict: 'user_id,check_date' },
  );
  if (error) return { success: false, error: friendly(error) };
  revalidatePath('/wellness');
  return { success: true, data: null };
}

export async function setChecklistTick(itemId: string, ticked: boolean): Promise<ActionResult<null>> {
  const user = await requireUser();
  if (!ALL_CHECKLIST_ITEM_IDS.has(itemId)) return { success: false, error: 'Unknown checklist item.' };
  const supabase = await createClient();
  const date = ukToday();
  const { error } = ticked
    ? await supabase.from('wellness_checklist_ticks').upsert({ user_id: user.id, check_date: date, item_id: itemId }, { onConflict: 'user_id,check_date,item_id' })
    : await supabase.from('wellness_checklist_ticks').delete().eq('user_id', user.id).eq('check_date', date).eq('item_id', itemId);
  if (error) return { success: false, error: friendly(error) };
  return { success: true, data: null };
}
