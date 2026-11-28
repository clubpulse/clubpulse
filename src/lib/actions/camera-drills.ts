'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/server';
import { ageOn } from '@/lib/community/age';
import { cameraDrillsEnabled } from '@/lib/camera-drills/flag';
import { pickDailyDrill, streakDays, streakLine, type BaselineScores, type DrillKey, type DrillRole } from '@/lib/camera-drills/plan';

const KEYS = new Set(['squat', 'balance', 'shoulder', 'jump', 'reach']);
const ROLES = new Set(['batter', 'bowler', 'either']);

export type DrillSummary = {
  junior: boolean;
  skipped: boolean;
  role: DrillRole;
  baseline: BaselineScores;
  today: { key: DrillKey; title: string; seconds: number; setup: string } | null;
  streak: number;
  streakText: string;
  history: Array<{ day: string; key: string; score: number }>;
};

function scoreOf(detail: unknown, fallback: number): number {
  const n = Number(fallback);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

export async function viewerIsJunior(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: members }] = await Promise.all([
    admin.from('profiles').select('date_of_birth').eq('id', userId).maybeSingle(),
    admin.from('club_members').select('is_junior').eq('user_id', userId).eq('is_active', true),
  ]);
  const marked = (members ?? []).length > 0 && (members ?? []).every((row) => row.is_junior === true);
  const age = ageOn((profile?.date_of_birth as string | null) ?? null);
  return marked || (age !== null && age < 18);
}

export async function loadDrillSummary(userId: string): Promise<DrillSummary | null> {
  if (!cameraDrillsEnabled()) return null;
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: baselines }, { data: sessions }, { data: prefs }, junior] = await Promise.all([
    admin.from('camera_drill_baselines').select('drill_key, score').eq('user_id', userId),
    admin.from('camera_drill_sessions').select('day, drill_key, score').eq('user_id', userId).order('day', { ascending: true }).limit(60),
    admin.from('camera_drill_prefs').select('role, skipped_at').eq('user_id', userId).maybeSingle(),
    viewerIsJunior(userId),
  ]);
  const baseline: BaselineScores = {};
  for (const row of baselines ?? []) baseline[row.drill_key as DrillKey] = scoreOf(null, row.score as number);
  const role = ROLES.has(prefs?.role as string) ? prefs!.role as DrillRole : 'either';
  const daily = pickDailyDrill({ role, scores: baseline, junior, day: today });
  const days = (sessions ?? []).map((row) => String(row.day).slice(0, 10));
  const streak = streakDays(days, today);
  return {
    junior,
    skipped: !!prefs?.skipped_at,
    role,
    baseline,
    today: { key: daily.key, title: daily.title, seconds: daily.seconds, setup: daily.setup },
    streak,
    streakText: streakLine(streak, junior),
    history: (sessions ?? []).map((row) => ({ day: String(row.day).slice(0, 10), key: row.drill_key as string, score: scoreOf(null, row.score as number) })),
  };
}

export async function saveDrillResult(input: { drillKey: unknown; score: unknown; detail: unknown; baseline: unknown }): Promise<{ success: true } | { success: false; error: string }> {
  if (!cameraDrillsEnabled()) return { success: false, error: 'Movement checks are not open yet.' };
  const user = await requireUser();
  if (typeof input.drillKey !== 'string' || !KEYS.has(input.drillKey)) return { success: false, error: 'That movement is not in the list.' };
  const junior = await viewerIsJunior(user.id);
  if (junior && input.drillKey === 'jump') return { success: false, error: 'That movement is not offered.' };
  const score = Number(input.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) return { success: false, error: 'That result could not be saved.' };
  const detail = input.detail && typeof input.detail === 'object' && !Array.isArray(input.detail) ? input.detail as Record<string, unknown> : {};
  const numbers: Record<string, number> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (typeof value === 'number' && Number.isFinite(value)) numbers[key] = value;
  }
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const row = { user_id: user.id, drill_key: input.drillKey, score, detail: numbers };
  const { error } = input.baseline
    ? await admin.from('camera_drill_baselines').upsert(row, { onConflict: 'user_id,drill_key' })
    : await admin.from('camera_drill_sessions').upsert({ ...row, day: today }, { onConflict: 'user_id,drill_key,day' });
  if (error) return { success: false, error: 'Could not save that result.' };
  revalidatePath('/drills');
  revalidatePath('/profile');
  return { success: true };
}

export async function skipBaseline(): Promise<{ success: true } | { success: false; error: string }> {
  if (!cameraDrillsEnabled()) return { success: false, error: 'Movement checks are not open yet.' };
  const user = await requireUser();
  const { error } = await createAdminClient().from('camera_drill_prefs').upsert({ user_id: user.id, skipped_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return { success: false, error: 'Could not save that choice.' };
  revalidatePath('/dashboard');
  return { success: true };
}

export async function setDrillRole(role: unknown): Promise<{ success: true } | { success: false; error: string }> {
  if (!cameraDrillsEnabled()) return { success: false, error: 'Movement checks are not open yet.' };
  const user = await requireUser();
  if (typeof role !== 'string' || !ROLES.has(role)) return { success: false, error: 'Choose batter, bowler, or either.' };
  const { error } = await createAdminClient().from('camera_drill_prefs').upsert({ user_id: user.id, role }, { onConflict: 'user_id' });
  if (error) return { success: false, error: 'Could not save that choice.' };
  revalidatePath('/drills');
  return { success: true };
}
