'use server';

import { randomInt } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/lib/types/action';
import { DEFAULT_WEEKLY_CAP } from '@/lib/types/scores-engine';
import {
  HILO_ROUNDS, QUIZ_LENGTH, SPIN_SEGMENTS, TIMING_BALLS,
  type GameInfo, type GameKey, type GamesState, type HiloPick, type HiloView, type QuizResult, type QuizView,
} from '@/lib/types/games';
import {
  AGE_GATE_MESSAGE, AWARD_ERRORS, awardScores, getPrimaryClubId, isAdultPlayer, ukToday, weekStartIso,
} from '@/lib/scores/context';
import { QUIZ_BANK, dailyQuestionIndexes } from '@/lib/scores/quiz-bank';

type Admin = ReturnType<typeof createAdminClient>;
type HiloState = { chain: Array<{ name: string; runs: number }>; round: number; correct: number };

const RULE_OF: Record<GameKey, string> = { spin: 'game_spin', quiz: 'game_quiz', timing: 'game_timing', hilo: 'game_hilo' };
const NO_MATCH_DATA = 'Needs season runs for at least five players. It unlocks once a few scorecards are in.';

async function context() {
  const user = await requireUser();
  const clubId = await getPrimaryClubId(user.id);
  return { user, clubId, admin: createAdminClient(), today: ukToday() };
}

async function ruleValues(admin: Admin, clubId: string): Promise<Record<GameKey, { value: number; enabled: boolean }>> {
  const sources = Object.values(RULE_OF);
  const [{ data: rules }, { data: overrides }] = await Promise.all([
    admin.from('scores_rules').select('source, default_amount').in('source', sources),
    admin.from('club_scores_rules').select('source, amount, is_enabled').eq('club_id', clubId).in('source', sources),
  ]);
  const out = {} as Record<GameKey, { value: number; enabled: boolean }>;
  (Object.keys(RULE_OF) as GameKey[]).forEach((g) => {
    const r = (rules ?? []).find((x) => x.source === RULE_OF[g]);
    const o = (overrides ?? []).find((x) => x.source === RULE_OF[g]);
    out[g] = {
      value: (o?.amount as number | null | undefined) ?? (r?.default_amount as number | undefined) ?? 0,
      enabled: !!r && (o ? (o.is_enabled as boolean) : true),
    };
  });
  return out;
}

/** Season runs per club member, highest first. */
async function seasonRuns(admin: Admin, clubId: string): Promise<Array<{ name: string; runs: number }>> {
  const yearStart = `${new Date().getUTCFullYear()}-01-01`;
  const { data: rows } = await admin
    .from('match_player_scores')
    .select('user_id, runs, match_scorecards!inner(club_id, match_date)')
    .eq('match_scorecards.club_id', clubId)
    .gte('match_scorecards.match_date', yearStart)
    .limit(5000);
  const totals = new Map<string, number>();
  (rows ?? []).forEach((r) => totals.set(r.user_id as string, (totals.get(r.user_id as string) ?? 0) + ((r.runs as number) ?? 0)));
  if (totals.size === 0) return [];
  const { data: names } = await admin.from('profiles').select('id, full_name, display_name').in('id', [...totals.keys()]);
  const nameOf = new Map((names ?? []).map((n) => [n.id as string, ((n.display_name as string) || (n.full_name as string) || 'Player')]));
  return [...totals.entries()].map(([id, runs]) => ({ name: nameOf.get(id) ?? 'Player', runs })).sort((a, b) => b.runs - a.runs);
}

/** A chain of five players in which neighbours never have the same total, or null if the club lacks the data. */
function buildChain(pool: Array<{ name: string; runs: number }>): HiloState['chain'] | null {
  const distinct = pool.filter((p, i, all) => all.findIndex((q) => q.runs === p.runs) === i);
  if (distinct.length < HILO_ROUNDS + 1) return null;
  const shuffled = [...distinct];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, HILO_ROUNDS + 1);
}

function hiloView(state: HiloState): HiloView {
  const a = state.chain[state.round], b = state.chain[state.round + 1];
  return { round: state.round + 1, rounds: HILO_ROUNDS, a, b: { name: b.name } };
}

// ── State ────────────────────────────────────────────────────────────────────

export async function getGamesState(): Promise<ActionResult<GamesState>> {
  const { user, clubId, admin, today } = await context();
  if (!clubId) return { success: false, error: 'You need to be a club member to play.' };

  const weekStart = weekStartIso();
  const [values, plays, adult, settings, capped, weekLedger, pool] = await Promise.all([
    ruleValues(admin, clubId),
    admin.from('game_plays').select('game, finished, score, amount').eq('user_id', user.id).eq('play_date', today),
    isAdultPlayer(user.id, clubId),
    admin.from('club_scores_settings').select('weekly_cap').eq('club_id', clubId).maybeSingle(),
    admin.from('scores_rules').select('source').eq('counts_to_cap', true),
    admin.from('scores_ledger').select('source, amount').eq('user_id', user.id).gte('created_at', weekStart),
    seasonRuns(admin, clubId),
  ]);

  const cappedSources = new Set((capped.data ?? []).map((r) => r.source as string));
  const used = (weekLedger.data ?? []).filter((r) => cappedSources.has(r.source as string)).reduce((a, r) => a + (r.amount as number), 0);
  const hasChain = buildChain(pool) !== null;

  const games = {} as Record<GameKey, GameInfo>;
  (Object.keys(RULE_OF) as GameKey[]).forEach((g) => {
    const p = (plays.data ?? []).find((x) => x.game === g);
    games[g] = {
      key: g,
      enabled: values[g].enabled,
      locked: g === 'spin' && !adult ? AGE_GATE_MESSAGE : g === 'hilo' && !hasChain && !p ? NO_MATCH_DATA : null,
      played: !!p?.finished,
      amount: (p?.amount as number | undefined) ?? 0,
      score: (p?.score as number | undefined) ?? 0,
      value: values[g].value,
    };
  });

  return {
    success: true,
    data: {
      clubId,
      earnedToday: Object.values(games).reduce((a, g) => a + g.amount, 0),
      weekly: { cap: settings.data ? (settings.data.weekly_cap as number | null) : DEFAULT_WEEKLY_CAP, used },
      games,
    },
  };
}

/** Claims today's play for a game. Returns false if it has already been played. */
async function claimPlay(admin: Admin, userId: string, clubId: string, game: GameKey, today: string, state: object = {}) {
  const { data, error } = await admin
    .from('game_plays')
    .insert({ user_id: userId, club_id: clubId, game, play_date: today, state })
    .select('id')
    .single();
  if (error) return null; // unique (user_id, game, play_date) violation = already played
  return data.id as string;
}

async function finishPlay(admin: Admin, playId: string, userId: string, clubId: string, game: GameKey, today: string, score: number, multiplier: number) {
  let amount = 0, capped = false;
  if (multiplier > 0) {
    const res = await awardScores(userId, clubId, RULE_OF[game], today, multiplier);
    if (res.ok) { amount = res.amount ?? 0; capped = !!res.capped; }
    else if (res.error === 'weekly_cap_reached') capped = true;
  }
  await admin.from('game_plays').update({ finished: true, score, amount }).eq('id', playId);
  revalidatePath('/games');
  return { amount, capped };
}

async function guard(game: GameKey) {
  const ctx = await context();
  if (!ctx.clubId) return { ...ctx, clubId: null as null, error: AWARD_ERRORS.not_member };
  const values = await ruleValues(ctx.admin, ctx.clubId);
  if (!values[game].enabled) return { ...ctx, error: AWARD_ERRORS.disabled };
  return { ...ctx, error: null as string | null };
}

// ── Daily Spin (chance: age-gated, free to play, server picks the segment) ───

export async function playSpin(): Promise<ActionResult<{ index: number; amount: number; capped: boolean }>> {
  const g = await guard('spin');
  if (g.error || !g.clubId) return { success: false, error: g.error ?? AWARD_ERRORS.not_member };
  if (!(await isAdultPlayer(g.user.id, g.clubId))) return { success: false, error: AGE_GATE_MESSAGE };

  const playId = await claimPlay(g.admin, g.user.id, g.clubId, 'spin', g.today);
  if (!playId) return { success: false, error: 'You have already had today\'s spin.' };

  const index = randomInt(SPIN_SEGMENTS.length);
  const { amount, capped } = await finishPlay(g.admin, playId, g.user.id, g.clubId, 'spin', g.today, index, SPIN_SEGMENTS[index]);
  return { success: true, data: { index, amount, capped } };
}

// ── Cricket Quiz (graded on the server) ──────────────────────────────────────

export async function getDailyQuiz(): Promise<ActionResult<QuizView>> {
  const g = await guard('quiz');
  if (g.error) return { success: false, error: g.error };
  const questions = dailyQuestionIndexes(g.today).map((i) => ({ q: QUIZ_BANK[i].q, options: [...QUIZ_BANK[i].options] }));
  return { success: true, data: { questions } };
}

export async function submitQuiz(answers: number[]): Promise<ActionResult<QuizResult>> {
  const g = await guard('quiz');
  if (g.error || !g.clubId) return { success: false, error: g.error ?? AWARD_ERRORS.not_member };
  if (!Array.isArray(answers) || answers.length !== QUIZ_LENGTH || answers.some((a) => ![0, 1, 2].includes(a))) {
    return { success: false, error: 'Answer all three questions.' };
  }
  const playId = await claimPlay(g.admin, g.user.id, g.clubId, 'quiz', g.today, { answers });
  if (!playId) return { success: false, error: 'You have already done today\'s quiz.' };

  const correctAnswers = dailyQuestionIndexes(g.today).map((i) => QUIZ_BANK[i].answer as number);
  const correct = correctAnswers.filter((a, i) => a === answers[i]).length;
  const { amount, capped } = await finishPlay(g.admin, playId, g.user.id, g.clubId, 'quiz', g.today, correct, correct);
  return { success: true, data: { correctAnswers, correct, amount, capped } };
}

// ── Middle It (timing game played in the browser; the result is bounded here) ─

export async function submitTiming(middled: number): Promise<ActionResult<{ amount: number; capped: boolean }>> {
  const g = await guard('timing');
  if (g.error || !g.clubId) return { success: false, error: g.error ?? AWARD_ERRORS.not_member };
  if (!Number.isInteger(middled) || middled < 0 || middled > TIMING_BALLS) return { success: false, error: 'Invalid result.' };

  const playId = await claimPlay(g.admin, g.user.id, g.clubId, 'timing', g.today);
  if (!playId) return { success: false, error: 'You have already played Middle It today.' };
  const res = await finishPlay(g.admin, playId, g.user.id, g.clubId, 'timing', g.today, middled, middled);
  return { success: true, data: res };
}

// ── Higher or Lower (the chain of players stays on the server) ───────────────

export async function startHilo(): Promise<ActionResult<HiloView>> {
  const g = await guard('hilo');
  if (g.error || !g.clubId) return { success: false, error: g.error ?? AWARD_ERRORS.not_member };

  const { data: existing } = await g.admin.from('game_plays').select('id, state, finished')
    .eq('user_id', g.user.id).eq('game', 'hilo').eq('play_date', g.today).maybeSingle();
  if (existing?.finished) return { success: false, error: 'You have already played Higher or Lower today.' };
  if (existing) return { success: true, data: hiloView(existing.state as HiloState) }; // resume

  const chain = buildChain(await seasonRuns(g.admin, g.clubId));
  if (!chain) return { success: false, error: NO_MATCH_DATA };
  const state: HiloState = { chain, round: 0, correct: 0 };
  const playId = await claimPlay(g.admin, g.user.id, g.clubId, 'hilo', g.today, state);
  if (!playId) return { success: false, error: 'Could not start the game. Please try again.' };
  return { success: true, data: hiloView(state) };
}

export async function pickHilo(higher: boolean): Promise<ActionResult<HiloPick>> {
  const g = await guard('hilo');
  if (g.error || !g.clubId) return { success: false, error: g.error ?? AWARD_ERRORS.not_member };

  const { data: play } = await g.admin.from('game_plays').select('id, state, finished')
    .eq('user_id', g.user.id).eq('game', 'hilo').eq('play_date', g.today).maybeSingle();
  if (!play || play.finished) return { success: false, error: 'Start a new game first.' };

  const state = play.state as HiloState;
  const a = state.chain[state.round], b = state.chain[state.round + 1];
  const wasCorrect = (b.runs > a.runs) === !!higher;
  const next: HiloState = { chain: state.chain, round: state.round + 1, correct: state.correct + (wasCorrect ? 1 : 0) };
  const finished = next.round >= HILO_ROUNDS;

  // Only advance from the round we read, so a double click cannot answer twice
  const { data: moved } = await g.admin.from('game_plays').update({ state: next })
    .eq('id', play.id).eq('finished', false).eq('state->>round', String(state.round)).select('id');
  if (!moved || moved.length === 0) return { success: false, error: 'That round has already been answered.' };

  let amount = 0, capped = false;
  if (finished) {
    ({ amount, capped } = await finishPlay(g.admin, play.id as string, g.user.id, g.clubId, 'hilo', g.today, next.correct, next.correct));
  }
  return {
    success: true,
    data: { wasCorrect, revealedRuns: b.runs, finished, correct: next.correct, amount, capped, next: finished ? null : hiloView(next) },
  };
}
