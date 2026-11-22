// The Wellness reads and writes that both the website's server actions and the app's API routes use.
// Every query is scoped to the signed-in person's id, which the caller has already verified.

import { createAdminClient } from '@/lib/supabase/admin';
import { awardScores, getPrimaryClubId } from '@/lib/scores/context';
import { ukToday } from '@/lib/utils/uk-date';
import { validateReadiness, type ReadinessInput } from './readiness';
import { lastDays, TREND_DAYS, validateRecovery, type ReadinessDay } from './trend';
import type { ActionResult } from '@/lib/types/action';

const NOT_READY = 'Readiness check-ins are not switched on yet. Please try again soon.';

/** A missing table (migration not run yet) must not crash a page or a screen. */
export function friendly(error: { code?: string; message?: string }): string {
  if (error.code === '42P01' || /does not exist|schema cache/i.test(error.message ?? '')) return NOT_READY;
  return 'Something went wrong. Please try again.';
}

export type TodayReadiness = Required<Omit<ReadinessInput, 'notes'>> & { notes: string | null };

export async function readinessToday(userId: string): Promise<ActionResult<{ date: string; readiness: TodayReadiness | null }>> {
  const date = ukToday();
  const { data, error } = await createAdminClient().from('wellness_readiness').select('sleep, mood, soreness, stress, notes').eq('user_id', userId).eq('check_date', date).maybeSingle();
  if (error) return { success: false, error: friendly(error) };
  return { success: true, data: { date, readiness: (data as TodayReadiness | null) ?? null } };
}

/** Saves today's check-in and pays Scores for the day's first one (the reference makes a second save pay nothing). */
export async function saveReadinessFor(userId: string, input: unknown): Promise<ActionResult<null>> {
  const v = validateReadiness(input);
  if (!v.ok) return { success: false, error: v.error };
  const { error } = await createAdminClient().from('wellness_readiness').upsert({ user_id: userId, check_date: ukToday(), ...v.value }, { onConflict: 'user_id,check_date' });
  if (error) return { success: false, error: friendly(error) };
  const clubId = await getPrimaryClubId(userId);
  if (clubId) await awardScores(userId, clubId, 'wellness_readiness', `day:${ukToday()}`).catch(() => undefined);
  return { success: true, data: null };
}

export async function readinessTrendFor(userId: string): Promise<ActionResult<{ days: string[]; rows: ReadinessDay[] }>> {
  const days = lastDays(ukToday(), TREND_DAYS);
  const { data, error } = await createAdminClient().from('wellness_readiness').select('check_date, sleep, mood, soreness, stress').eq('user_id', userId).gte('check_date', days[0]).order('check_date');
  if (error) return { success: false, error: friendly(error) };
  return { success: true, data: { days, rows: (data ?? []).map((r) => ({ date: r.check_date as string, sleep: r.sleep as number, mood: r.mood as number, soreness: r.soreness as number, stress: r.stress as number })) } };
}

export type RecoveryRow = { id: string; date: string; soreness: number | null; activity: string | null; notes: string | null };

export async function recoveryLogFor(userId: string): Promise<ActionResult<RecoveryRow[]>> {
  const { data, error } = await createAdminClient().from('wellness_recovery').select('id, log_date, soreness, activity, notes').eq('user_id', userId).order('log_date', { ascending: false }).limit(30);
  if (error) return { success: false, error: friendly(error) };
  return { success: true, data: (data ?? []).map((r) => ({ id: r.id as string, date: r.log_date as string, soreness: (r.soreness as number | null) ?? null, activity: (r.activity as string | null) ?? null, notes: (r.notes as string | null) ?? null })) };
}

export async function saveRecoveryFor(userId: string, input: unknown): Promise<ActionResult<null>> {
  const v = validateRecovery(input);
  if (!v.ok) return { success: false, error: v.error };
  const { error } = await createAdminClient().from('wellness_recovery').upsert({ user_id: userId, log_date: ukToday(), ...v.value }, { onConflict: 'user_id,log_date' });
  if (error) return { success: false, error: friendly(error) };
  return { success: true, data: null };
}

export async function deleteRecoveryFor(userId: string, id: string): Promise<ActionResult<null>> {
  const { error } = await createAdminClient().from('wellness_recovery').delete().eq('id', id).eq('user_id', userId);
  if (error) return { success: false, error: friendly(error) };
  return { success: true, data: null };
}

export type ShareClub = { clubId: string; name: string; share: boolean; canShare: boolean };

/** The player's clubs and whether they share readiness averages with each club's coaches. Under-18s cannot share. */
export async function shareSettingsFor(userId: string): Promise<ActionResult<ShareClub[]>> {
  const admin = createAdminClient();
  const { data: members, error } = await admin.from('club_members').select('club_id, is_junior, clubs ( name )').eq('user_id', userId).eq('is_active', true);
  if (error) return { success: false, error: 'Something went wrong. Please try again.' };
  const { data: consent, error: cErr } = await admin.from('wellness_share_consent').select('club_id, share_readiness').eq('user_id', userId);
  if (cErr) return { success: false, error: friendly(cErr) };
  return {
    success: true,
    data: (members ?? []).map((m) => {
      const club = (Array.isArray(m.clubs) ? m.clubs[0] : m.clubs) as { name: string } | null;
      return { clubId: m.club_id as string, name: club?.name ?? 'Your club', share: (consent ?? []).some((c) => c.club_id === m.club_id && c.share_readiness === true), canShare: m.is_junior !== true };
    }),
  };
}

export async function setShareFor(userId: string, clubId: string, share: boolean): Promise<ActionResult<null>> {
  const settings = await shareSettingsFor(userId);
  if (!settings.success) return settings;
  const club = settings.data.find((c) => c.clubId === clubId);
  if (!club) return { success: false, error: 'Club not found.' };
  if (share && !club.canShare) return { success: false, error: 'Sharing is not available for under-18s.' };
  const { error } = await createAdminClient().from('wellness_share_consent').upsert(
    { user_id: userId, club_id: clubId, share_readiness: share, agreed_at: share ? new Date().toISOString() : null },
    { onConflict: 'user_id,club_id' },
  );
  if (error) return { success: false, error: friendly(error) };
  return { success: true, data: null };
}
