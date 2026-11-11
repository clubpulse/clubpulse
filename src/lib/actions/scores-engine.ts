'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { isClubAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { totalBalance } from '@/lib/types/scores';
import type { ActionResult } from '@/lib/types/action';
import {
  DEFAULT_WEEKLY_CAP,
  type Challenge, type ChallengeKey, type ClubScoresRule, type ClubScoresSettings,
  type LeagueRow, type LedgerEntry, type PlaySummary, type ScoresRule,
} from '@/lib/types/scores-engine';
import {
  AWARD_ERRORS, awardScores, getPrimaryClubId, isAdultPlayer, monthStartIso, ukToday, weekStartIso,
} from '@/lib/scores/context';

type Admin = ReturnType<typeof createAdminClient>;

const CHALLENGES: Array<Omit<Challenge, 'done' | 'claimed'>> = [
  { key: 'availability', icon: '📅', title: 'Set your availability', detail: 'Reply to a fixture this week', href: '/availability' },
  { key: 'coaching',     icon: '🎥', title: 'Record an AI coaching session', detail: 'Analyse a batting clip this week', href: '/analyse' },
  { key: 'gut_feeling',  icon: '🔮', title: 'Call a result on Gut Feeling', detail: 'Make a prediction this week', href: '/gut-feeling' },
  { key: 'pitch',        icon: '🌀', title: 'Predict the pitch', detail: 'Vote on Curse the Pitch this week', href: '/curse-the-pitch' },
  { key: 'wellbeing',    icon: '💚', title: 'Do your wellbeing check-in', detail: 'A private check-in, once a week', href: '/wellbeing' },
];

const OTHER_LABEL = 'Match, steps and club earnings';

// ── Rules and settings ───────────────────────────────────────────────────────

async function loadRules(admin: Admin, clubId: string): Promise<ClubScoresRule[]> {
  const [{ data: rules }, { data: overrides }] = await Promise.all([
    admin.from('scores_rules').select('*').order('sort_order'),
    admin.from('club_scores_rules').select('source, amount, is_enabled').eq('club_id', clubId),
  ]);
  const byKey = new Map((overrides ?? []).map((o) => [o.source as string, o]));
  return ((rules ?? []) as ScoresRule[]).map((r) => {
    const o = byKey.get(r.source);
    const overridden = o?.amount !== null && o?.amount !== undefined;
    return {
      ...r,
      amount: overridden ? (o!.amount as number) : r.default_amount,
      is_overridden: overridden,
      is_enabled: o ? (o.is_enabled as boolean) : true,
    };
  });
}

async function loadSettings(admin: Admin, clubId: string): Promise<ClubScoresSettings> {
  const { data } = await admin
    .from('club_scores_settings')
    .select('weekly_cap, monthly_goal, monthly_goal_reward')
    .eq('club_id', clubId)
    .maybeSingle();
  if (!data) return { weekly_cap: DEFAULT_WEEKLY_CAP, monthly_goal: null, monthly_goal_reward: null };
  return data as ClubScoresSettings;
}

// ── Weekly challenges: what has the player actually done this week? ──────────

async function challengeProgress(admin: Admin, userId: string, clubId: string, weekStart: string): Promise<Record<ChallengeKey, boolean>> {
  const weekDate = weekStart.slice(0, 10);
  const [avail, coaching, gut, pitch, wellbeing] = await Promise.all([
    admin.from('fixture_availability').select('id, fixtures!inner(club_id)', { count: 'exact', head: true })
      .eq('user_id', userId).neq('status', 'unknown').gte('updated_at', weekStart).eq('fixtures.club_id', clubId),
    admin.from('analysis_results').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', weekStart),
    admin.from('gut_predictions').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).gte('created_at', weekStart),
    admin.from('pitch_votes').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('club_id', clubId).gte('created_at', weekStart),
    admin.from('wellbeing_checkins').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('club_id', clubId).gte('check_week', weekDate),
  ]);
  return {
    availability: (avail.count ?? 0) > 0,
    coaching: (coaching.count ?? 0) > 0,
    gut_feeling: (gut.count ?? 0) > 0,
    pitch: (pitch.count ?? 0) > 0,
    wellbeing: (wellbeing.count ?? 0) > 0,
  };
}

// ── Play page ────────────────────────────────────────────────────────────────

export async function getPlaySummary(): Promise<ActionResult<PlaySummary>> {
  const user = await requireUser();
  const clubId = await getPrimaryClubId(user.id);
  if (!clubId) return { success: false, error: 'You need to be a club member to earn Scores here.' };

  const admin = createAdminClient();
  const weekStart = weekStartIso();
  const weekKey = weekStart.slice(0, 10);
  const today = ukToday();
  const yesterday = ukToday(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const [rules, settings, wallet, weekLedger, recentLedger, checkins, progress, adult, member, scratchCfg, weekTotals, monthTotals] =
    await Promise.all([
      loadRules(admin, clubId),
      loadSettings(admin, clubId),
      admin.from('creds_wallet').select('flexi_balance, reward_balance').eq('user_id', user.id).maybeSingle(),
      admin.from('scores_ledger').select('source, amount, reference').eq('user_id', user.id).gte('created_at', weekStart),
      admin.from('scores_ledger').select('id, source, amount, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(8),
      admin.from('daily_checkins').select('checkin_date, streak_day').eq('user_id', user.id)
        .in('checkin_date', [today, yesterday]),
      challengeProgress(admin, user.id, clubId, weekStart),
      isAdultPlayer(user.id, clubId),
      admin.from('club_members').select('is_junior').eq('user_id', user.id).eq('club_id', clubId).maybeSingle(),
      admin.from('scratch_card_config').select('is_active').eq('club_id', clubId).maybeSingle(),
      admin.rpc('club_scores_totals', { p_club_id: clubId, p_since: weekStart }),
      admin.rpc('club_scores_totals', { p_club_id: clubId, p_since: monthStartIso() }),
    ]);

  const rule = (source: string) => rules.find((r) => r.source === source);
  const cappedSources = new Set(rules.filter((r) => r.counts_to_cap).map((r) => r.source));
  const weekRows = weekLedger.data ?? [];
  const used = weekRows.filter((r) => cappedSources.has(r.source as string)).reduce((a, r) => a + (r.amount as number), 0);

  // Check-in
  const todayRow = (checkins.data ?? []).find((c) => c.checkin_date === today);
  const yRow = (checkins.data ?? []).find((c) => c.checkin_date === yesterday);
  const lastDay = todayRow ? (todayRow.streak_day as number) : yRow ? (yRow.streak_day as number) : 0;
  const nextDay = todayRow
    ? ((todayRow.streak_day as number) >= 7 ? 1 : (todayRow.streak_day as number) + 1)
    : (!yRow || (yRow.streak_day as number) >= 7 ? 1 : (yRow.streak_day as number) + 1);

  // Challenges
  const claimedRefs = new Set(weekRows.filter((r) => r.source === 'weekly_challenge').map((r) => r.reference as string));
  const list: Challenge[] = CHALLENGES.map((c) => ({
    ...c,
    done: progress[c.key],
    claimed: claimedRefs.has(`${weekKey}:${c.key}`),
  }));

  // League and club goal
  type Total = { user_id: string; total: number };
  const weekT = ((weekTotals.data ?? []) as Total[]).map((t) => ({ user_id: t.user_id, total: Number(t.total) }));
  const monthT = ((monthTotals.data ?? []) as Total[]).map((t) => ({ user_id: t.user_id, total: Number(t.total) }));
  const sorted = [...weekT].sort((a, b) => b.total - a.total);
  if (!sorted.some((t) => t.user_id === user.id)) sorted.push({ user_id: user.id, total: 0 });
  const myIndex = sorted.findIndex((t) => t.user_id === user.id);
  const shown = sorted.slice(0, 10);
  if (myIndex >= 10) shown.push(sorted[myIndex]);
  const { data: names } = await admin.from('profiles').select('id, full_name, display_name').in('id', shown.map((t) => t.user_id));
  const nameOf = new Map((names ?? []).map((n) => [n.id as string, ((n.display_name as string) || (n.full_name as string) || 'Player')]));
  const league: LeagueRow[] = shown.map((t) => ({
    name: t.user_id === user.id ? 'You' : (nameOf.get(t.user_id) ?? 'Player'),
    total: t.total,
    isMe: t.user_id === user.id,
    rank: sorted.findIndex((s) => s.user_id === t.user_id) + 1,
  }));

  const labelOf = new Map(rules.map((r) => [r.source, r.label]));
  const recent: LedgerEntry[] = (recentLedger.data ?? []).map((r) => ({
    id: r.id as string,
    label: labelOf.get(r.source as string) ?? OTHER_LABEL,
    amount: r.amount as number,
    created_at: r.created_at as string,
  }));

  return {
    success: true,
    data: {
      clubId,
      balance: totalBalance(wallet.data ?? null),
      isAdult: adult,
      isJunior: !!member.data?.is_junior,
      weekly: { cap: settings.weekly_cap, used },
      checkin: {
        enabled: rule('daily_checkin')?.is_enabled ?? false,
        doneToday: !!todayRow,
        nextDay,
        lastDay,
        base: rule('daily_checkin')?.amount ?? 0,
        day7Card: !!scratchCfg.data?.is_active && adult,
      },
      challenges: {
        enabled: rule('weekly_challenge')?.is_enabled ?? false,
        reward: rule('weekly_challenge')?.amount ?? 0,
        fullHouseReward: rule('weekly_full_house')?.is_enabled ? (rule('weekly_full_house')?.amount ?? 0) : 0,
        fullHouseClaimed: weekRows.some((r) => r.source === 'weekly_full_house'),
        list,
      },
      clubGoal: settings.monthly_goal
        ? {
            goal: settings.monthly_goal,
            reward: settings.monthly_goal_reward,
            total: monthT.reduce((a, t) => a + t.total, 0),
            mine: monthT.find((t) => t.user_id === user.id)?.total ?? 0,
            contributors: monthT.length,
          }
        : null,
      league,
      recent,
    },
  };
}

export async function checkIn(): Promise<ActionResult<{ day: number; amount: number; gotCard: boolean; capped: boolean }>> {
  const user = await requireUser();
  const clubId = await getPrimaryClubId(user.id);
  if (!clubId) return { success: false, error: AWARD_ERRORS.not_member };

  const { data, error } = await createAdminClient().rpc('perform_daily_checkin', { p_user_id: user.id, p_club_id: clubId });
  if (error) return { success: false, error: 'Check-in failed. Please try again.' };
  const res = data as { ok: boolean; error?: string; day?: number; amount?: number; got_card?: boolean; capped?: boolean };
  if (!res.ok) {
    return { success: false, error: res.error === 'already_checked_in' ? 'You have already checked in today.' : (AWARD_ERRORS[res.error ?? ''] ?? 'Check-in failed.') };
  }
  revalidatePath('/play');
  return { success: true, data: { day: res.day!, amount: res.amount ?? 0, gotCard: !!res.got_card, capped: !!res.capped } };
}

export async function claimChallenge(key: ChallengeKey): Promise<ActionResult<{ amount: number; fullHouse: number; capped: boolean }>> {
  const user = await requireUser();
  if (!CHALLENGES.some((c) => c.key === key)) return { success: false, error: 'Unknown challenge.' };
  const clubId = await getPrimaryClubId(user.id);
  if (!clubId) return { success: false, error: AWARD_ERRORS.not_member };

  const admin = createAdminClient();
  const weekStart = weekStartIso();
  const weekKey = weekStart.slice(0, 10);

  // Never trust the client: re-check that the challenge has really been done this week.
  const progress = await challengeProgress(admin, user.id, clubId, weekStart);
  if (!progress[key]) return { success: false, error: 'You have not completed this challenge yet.' };

  const res = await awardScores(user.id, clubId, 'weekly_challenge', `${weekKey}:${key}`);
  if (!res.ok) return { success: false, error: AWARD_ERRORS[res.error ?? ''] ?? 'Could not claim this challenge.' };

  // Full house: every challenge claimed this week
  let fullHouse = 0;
  const { count } = await admin.from('scores_ledger').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('source', 'weekly_challenge').like('reference', `${weekKey}:%`);
  if ((count ?? 0) >= CHALLENGES.length) {
    const bonus = await awardScores(user.id, clubId, 'weekly_full_house', weekKey);
    if (bonus.ok) fullHouse = bonus.amount ?? 0;
  }

  revalidatePath('/play');
  return { success: true, data: { amount: res.amount ?? 0, fullHouse, capped: !!res.capped } };
}

// ── Age confirmation ─────────────────────────────────────────────────────────

export async function confirmAdult(): Promise<ActionResult<void>> {
  const user = await requireUser();
  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({ age_confirmed_18: true, age_confirmed_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) return { success: false, error: 'Could not save. Please try again.' };
  revalidatePath('/play');
  return { success: true, data: undefined };
}

// ── Club admin ───────────────────────────────────────────────────────────────

export async function getScoresAdmin(clubId: string): Promise<ActionResult<{ rules: ClubScoresRule[]; settings: ClubScoresSettings; hasSettings: boolean }>> {
  const user = await requireUser();
  if (!(await isClubAdmin(user.id, clubId))) return { success: false, error: 'Not authorised' };
  const admin = createAdminClient();
  const [rules, settings, row] = await Promise.all([
    loadRules(admin, clubId),
    loadSettings(admin, clubId),
    admin.from('club_scores_settings').select('club_id').eq('club_id', clubId).maybeSingle(),
  ]);
  return { success: true, data: { rules, settings, hasSettings: !!row.data } };
}

function wholeNumber(v: unknown, max: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : null;
}

export async function saveScoresRule(
  clubId: string,
  source: string,
  values: { amount: number | null; is_enabled: boolean },
): Promise<ActionResult<void>> {
  const user = await requireUser();
  if (!(await isClubAdmin(user.id, clubId))) return { success: false, error: 'Not authorised' };
  if (values.amount !== null && wholeNumber(values.amount, 10000) === null) {
    return { success: false, error: 'Value must be a whole number between 0 and 10,000.' };
  }
  const { error } = await createAdminClient().from('club_scores_rules').upsert(
    { club_id: clubId, source, amount: values.amount, is_enabled: !!values.is_enabled, updated_at: new Date().toISOString() },
    { onConflict: 'club_id,source' },
  );
  if (error) return { success: false, error: 'Could not save this rule.' };
  revalidatePath('/admin/club/scores-rules');
  return { success: true, data: undefined };
}

export async function saveScoresSettings(clubId: string, values: ClubScoresSettings): Promise<ActionResult<void>> {
  const user = await requireUser();
  if (!(await isClubAdmin(user.id, clubId))) return { success: false, error: 'Not authorised' };
  if (values.weekly_cap !== null && wholeNumber(values.weekly_cap, 100000) === null) {
    return { success: false, error: 'Weekly limit must be a whole number, or empty for no limit.' };
  }
  if (values.monthly_goal !== null && (wholeNumber(values.monthly_goal, 100000000) === null || values.monthly_goal === 0)) {
    return { success: false, error: 'Club goal must be a whole number above zero, or empty to switch it off.' };
  }
  const reward = values.monthly_goal_reward?.trim().slice(0, 140) || null;
  const { error } = await createAdminClient().from('club_scores_settings').upsert(
    { club_id: clubId, weekly_cap: values.weekly_cap, monthly_goal: values.monthly_goal, monthly_goal_reward: reward, updated_at: new Date().toISOString() },
    { onConflict: 'club_id' },
  );
  if (error) return { success: false, error: 'Could not save settings.' };
  revalidatePath('/admin/club/scores-rules');
  return { success: true, data: undefined };
}

export async function setMemberJunior(clubId: string, memberUserId: string, isJunior: boolean): Promise<ActionResult<void>> {
  const user = await requireUser();
  if (!(await isClubAdmin(user.id, clubId))) return { success: false, error: 'Not authorised' };
  const { error } = await createAdminClient().from('club_members')
    .update({ is_junior: !!isJunior }).eq('club_id', clubId).eq('user_id', memberUserId);
  if (error) return { success: false, error: 'Could not update this member.' };
  revalidatePath('/admin/club/scores-rules');
  return { success: true, data: undefined };
}
