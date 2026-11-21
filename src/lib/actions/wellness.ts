'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { ukToday } from '@/lib/utils/uk-date';
import { validateReadiness, type ReadinessInput } from '@/lib/wellness/readiness';
import { ALL_CHECKLIST_ITEM_IDS } from '@/lib/wellness/content';
import type { ActionResult } from '@/lib/types/action';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanRoutine, lastDays, TREND_DAYS, validateRecovery, type ReadinessDay, type RecoveryInput } from '@/lib/wellness/trend';

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

// ── Full pillar: trend, routine, recovery log, sharing ──────────────────────────────────────────


export async function getReadinessTrend(): Promise<ActionResult<{ days: string[]; rows: ReadinessDay[] }>> {
  const user = await requireUser();
  const supabase = await createClient();
  const days = lastDays(ukToday(), TREND_DAYS);
  const { data, error } = await supabase.from('wellness_readiness').select('check_date, sleep, mood, soreness, stress').eq('user_id', user.id).gte('check_date', days[0]).order('check_date');
  if (error) return { success: false, error: friendly(error) };
  return { success: true, data: { days, rows: (data ?? []).map((r) => ({ date: r.check_date as string, sleep: r.sleep as number, mood: r.mood as number, soreness: r.soreness as number, stress: r.stress as number })) } };
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

export type RecoveryRow = { id: string; date: string; soreness: number | null; activity: string | null; notes: string | null };

export async function getRecoveryLog(): Promise<ActionResult<RecoveryRow[]>> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from('wellness_recovery').select('id, log_date, soreness, activity, notes').eq('user_id', user.id).order('log_date', { ascending: false }).limit(30);
  if (error) return { success: false, error: friendly(error) };
  return { success: true, data: (data ?? []).map((r) => ({ id: r.id as string, date: r.log_date as string, soreness: (r.soreness as number | null) ?? null, activity: (r.activity as string | null) ?? null, notes: (r.notes as string | null) ?? null })) };
}

export async function saveRecovery(input: unknown): Promise<ActionResult<null>> {
  const user = await requireUser();
  const v = validateRecovery(input);
  if (!v.ok) return { success: false, error: v.error };
  const value: RecoveryInput = v.value;
  const supabase = await createClient();
  const { error } = await supabase.from('wellness_recovery').upsert({ user_id: user.id, log_date: ukToday(), ...value }, { onConflict: 'user_id,log_date' });
  if (error) return { success: false, error: friendly(error) };
  revalidatePath('/wellness/recovery');
  return { success: true, data: null };
}

export async function deleteRecovery(id: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from('wellness_recovery').delete().eq('id', id).eq('user_id', user.id);
  if (error) return { success: false, error: friendly(error) };
  revalidatePath('/wellness/recovery');
  return { success: true, data: null };
}

export type ShareClub = { clubId: string; name: string; share: boolean; canShare: boolean };

/** The player's clubs and whether they share readiness averages with each club's coaches. Under-18s cannot share. */
export async function getShareSettings(): Promise<ActionResult<ShareClub[]>> {
  const user = await requireUser();
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: members, error } = await admin.from('club_members').select('club_id, is_junior, clubs ( name )').eq('user_id', user.id).eq('is_active', true);
  if (error) return { success: false, error: 'Something went wrong. Please try again.' };
  const { data: consent, error: cErr } = await supabase.from('wellness_share_consent').select('club_id, share_readiness').eq('user_id', user.id);
  if (cErr) return { success: false, error: friendly(cErr) };
  return {
    success: true,
    data: (members ?? []).map((m) => {
      const club = (Array.isArray(m.clubs) ? m.clubs[0] : m.clubs) as { name: string } | null;
      return { clubId: m.club_id as string, name: club?.name ?? 'Your club', share: (consent ?? []).some((c) => c.club_id === m.club_id && c.share_readiness === true), canShare: m.is_junior !== true };
    }),
  };
}

export async function setShareReadiness(clubId: string, share: boolean): Promise<ActionResult<null>> {
  const user = await requireUser();
  const settings = await getShareSettings();
  if (!settings.success) return settings;
  const club = settings.data.find((c) => c.clubId === clubId);
  if (!club) return { success: false, error: 'Club not found.' };
  if (share && !club.canShare) return { success: false, error: 'Sharing is not available for under-18s.' };
  const supabase = await createClient();
  const { error } = await supabase.from('wellness_share_consent').upsert(
    { user_id: user.id, club_id: clubId, share_readiness: share, agreed_at: share ? new Date().toISOString() : null },
    { onConflict: 'user_id,club_id' },
  );
  if (error) return { success: false, error: friendly(error) };
  revalidatePath('/wellness/settings');
  return { success: true, data: null };
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
