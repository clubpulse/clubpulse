'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { ukToday } from '@/lib/utils/uk-date';
import type { ReadinessInput } from '@/lib/wellness/readiness';
import { ALL_CHECKLIST_ITEM_IDS } from '@/lib/wellness/content';
import type { ActionResult } from '@/lib/types/action';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanRoutine, type ReadinessDay } from '@/lib/wellness/trend';
import {
  deleteRecoveryFor, friendly, readinessTrendFor, recoveryLogFor, saveReadinessFor, saveRecoveryFor, setShareFor, shareSettingsFor,
  type RecoveryRow as Recovery, type ShareClub as Share,
} from '@/lib/wellness/service';

export type WellnessToday = {
  date: string;
  readiness: (Required<Omit<ReadinessInput, 'notes'>> & { notes: string | null }) | null;
  ticks: string[];
};

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
  const r = await saveReadinessFor(user.id, input);
  if (r.success) revalidatePath('/wellness');
  return r;
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

// ── Full pillar: trend, routine, recovery log, sharing ──────────────────────────────────────────


export async function getReadinessTrend(): Promise<ActionResult<{ days: string[]; rows: ReadinessDay[] }>> {
  const user = await requireUser();
  return readinessTrendFor(user.id);
}

export async function getMyRoutine(): Promise<ActionResult<{ itemIds: string[]; ticks: string[] }>> {
  const user = await requireUser();
  const supabase = await createClient();
  const [r, t] = await Promise.all([
    supabase.from('wellness_routines').select('item_ids').eq('user_id', user.id).maybeSingle(),
    supabase.from('wellness_checklist_ticks').select('item_id').eq('user_id', user.id).eq('check_date', ukToday()),
  ]);
  if (r.error) return { success: false, error: friendly(r.error) };
  if (t.error) return { success: false, error: friendly(t.error) };
  return { success: true, data: { itemIds: (r.data?.item_ids as string[] | undefined) ?? [], ticks: (t.data ?? []).map((x) => x.item_id as string) } };
}

export async function saveMyRoutine(ids: unknown): Promise<ActionResult<null>> {
  const user = await requireUser();
  const clean = cleanRoutine(ids, ALL_CHECKLIST_ITEM_IDS);
  const supabase = await createClient();
  const { error } = await supabase.from('wellness_routines').upsert({ user_id: user.id, item_ids: clean, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return { success: false, error: friendly(error) };
  revalidatePath('/wellness/routine');
  return { success: true, data: null };
}

export type RecoveryRow = Recovery;

export async function getRecoveryLog(): Promise<ActionResult<RecoveryRow[]>> {
  const user = await requireUser();
  return recoveryLogFor(user.id);
}

export async function saveRecovery(input: unknown): Promise<ActionResult<null>> {
  const user = await requireUser();
  const r = await saveRecoveryFor(user.id, input);
  if (r.success) revalidatePath('/wellness/recovery');
  return r;
}

export async function deleteRecovery(id: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  const r = await deleteRecoveryFor(user.id, id);
  if (r.success) revalidatePath('/wellness/recovery');
  return r;
}

export type ShareClub = Share;

/** The player's clubs and whether they share readiness averages with each club's coaches. Under-18s cannot share. */
export async function getShareSettings(): Promise<ActionResult<ShareClub[]>> {
  const user = await requireUser();
  return shareSettingsFor(user.id);
}

export async function setShareReadiness(clubId: string, share: boolean): Promise<ActionResult<null>> {
  const user = await requireUser();
  const r = await setShareFor(user.id, clubId, share);
  if (r.success) revalidatePath('/wellness/settings');
  return r;
}

export type TeamReadinessRow = { name: string; checkIns: number; sleep: number; mood: number; soreness: number; stress: number };

/** What a coach may see: averages for adults who chose to share, via the database function only. */
export async function getTeamReadiness(clubId: string, days = 7): Promise<ActionResult<TeamReadinessRow[]>> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_consented_readiness', { p_club_id: clubId, p_days: days });
  if (error) return { success: false, error: friendly(error) };
  const res = data as { ok: boolean; error?: string; data?: Array<{ user_id: string; check_ins: number; avg_sleep: number; avg_mood: number; avg_soreness: number; avg_stress: number }> };
  if (!res?.ok) return { success: false, error: 'You need to be a coach or club admin of this club.' };
  const rows = res.data ?? [];
  const admin = createAdminClient();
  const { data: profiles } = rows.length ? await admin.from('profiles').select('id, full_name, display_name').in('id', rows.map((r) => r.user_id)) : { data: [] as Array<{ id: string; full_name: string | null; display_name: string | null }> };
  void user;
  return {
    success: true,
    data: rows.map((r) => {
      const p = (profiles ?? []).find((x) => x.id === r.user_id);
      return { name: p?.display_name || p?.full_name || 'Player', checkIns: r.check_ins, sleep: r.avg_sleep, mood: r.avg_mood, soreness: r.avg_soreness, stress: r.avg_stress };
    }),
  };
}
