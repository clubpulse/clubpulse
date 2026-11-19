// Server-only. Season Manager for a member whose id has been verified.
//
// A season is one game_plays row: state holds the seed and every selection so far, and the season
// is rebuilt from those each time (lib/games/manager). One match a day. A win pays the club's
// rule value; the final league place pays a bonus.

import { randomInt } from 'node:crypto';
import { awardScores } from '@/lib/scores/context';
import {
  SEASON_MATCHES, isOver, place, replaySeason, selectionError, suggestXI, table,
  type MatchReport, type Player, type Selection, type TableRow,
} from '@/lib/games/manager';
import { countTowardCard, gameContext, type GameContext } from '@/lib/mobile/game-context';

const GAME = 'manager';
const RULE = 'game_manager';
/** Bonus for the final league place, as a multiple of the rule value: 1st, 2nd, 3rd. */
export const PLACE_BONUS = [5, 3, 2];

type State = { seed: number; selections: Selection[]; lastMatch: string | null; played: number };
type Row = { id: string; play_date: string; state: State; finished: boolean; amount: number };
type Failure = { ok: false; error: string; status: number };

export type ManagerStatus = {
  note: string | null;
  /** Scores for a win at this club, and for finishing 1st, 2nd, 3rd. */
  winAmount: number;
  placeAmounts: number[];
  season: null | {
    match: number;
    matches: number;
    over: boolean;
    /** False once today's match has been played. */
    canPlayToday: boolean;
    opponent: { name: string; level: 'weaker' | 'even' | 'stronger' } | null;
    squad: Player[];
    suggested: number[];
    reports: MatchReport[];
    table: TableRow[];
    place: number;
    earned: number;
  };
  /** A season can be started: there is none, or the last one is over. */
  canStart: boolean;
};

async function latest(ctx: GameContext, userId: string): Promise<Row | null> {
  const { data } = await ctx.admin
    .from('game_plays').select('id, play_date, state, finished, amount')
    .eq('user_id', userId).eq('game', GAME).order('play_date', { ascending: false }).limit(1).maybeSingle();
  return (data as Row | null) ?? null;
}

function view(row: Row, today: string): NonNullable<ManagerStatus['season']> | null {
  const season = replaySeason(row.state.seed, row.state.selections ?? []);
  if (!season) return null;
  const over = isOver(season);
  const rival = over ? null : season.rivals[season.fixtures[season.reports.length]];
  const ours = season.squad.reduce((a, p) => a + Math.max(p.bat, p.bowl), 0) / season.squad.length;
  return {
    match: Math.min(season.reports.length + 1, SEASON_MATCHES),
    matches: SEASON_MATCHES,
    over,
    canPlayToday: !over && row.state.lastMatch !== today,
    opponent: rival ? { name: rival.name, level: rival.strength >= ours - 3 ? (rival.strength >= ours + 3 ? 'stronger' : 'even') : 'weaker' } : null,
    squad: season.squad,
    suggested: over ? [] : suggestXI(season),
    reports: season.reports,
    table: table(season),
    place: place(season),
    earned: row.amount,
  };
}

export async function getManager(userId: string): Promise<ManagerStatus> {
  const ctx = await gameContext(userId, RULE);
  const base = {
    note: !ctx.clubId ? 'Join a club to play Season Manager.' : !ctx.pays ? 'This game does not earn Scores at your club. You can still play.' : null,
    winAmount: ctx.pays ? ctx.value : 0,
    placeAmounts: PLACE_BONUS.map((m) => (ctx.pays ? m * ctx.value : 0)),
  };
  if (!ctx.clubId) return { ...base, season: null, canStart: false };
  const row = await latest(ctx, userId);
  const season = row ? view(row, ctx.today) : null;
  return { ...base, season, canStart: !season || season.over };
}

export async function startManager(userId: string): Promise<{ ok: true } | Failure> {
  const ctx = await gameContext(userId, RULE);
  if (!ctx.clubId) return { ok: false, error: 'Join a club to play Season Manager.', status: 403 };
  const row = await latest(ctx, userId);
  if (row && !row.finished) return { ok: false, error: 'Finish your current season first.', status: 409 };
  const state: State = { seed: randomInt(1, 2_000_000_000), selections: [], lastMatch: null, played: 0 };
  const { error } = await ctx.admin.from('game_plays').insert({ user_id: userId, club_id: ctx.clubId, game: GAME, play_date: ctx.today, state });
  // The unique (user, game, day) row also stops two seasons being started on the same day
  if (error) return { ok: false, error: 'You can start one new season a day. Come back tomorrow.', status: 409 };
  return { ok: true };
}

export async function playManagerMatch(
  userId: string,
  raw: unknown,
): Promise<{ ok: true; report: MatchReport; amount: number; bonus: number; capped: boolean; over: boolean; place: number; card: boolean } | Failure> {
  const ctx = await gameContext(userId, RULE);
  if (!ctx.clubId) return { ok: false, error: 'Join a club to play Season Manager.', status: 403 };
  const row = await latest(ctx, userId);
  if (!row || row.finished) return { ok: false, error: 'Start a season first.', status: 409 };
  if (row.state.lastMatch === ctx.today) return { ok: false, error: "You have played today's match. The next one is tomorrow.", status: 409 };

  const before = replaySeason(row.state.seed, row.state.selections ?? []);
  if (!before || isOver(before)) return { ok: false, error: 'This season is over.', status: 409 };
  const problem = selectionError(before, raw);
  if (problem) return { ok: false, error: problem, status: 400 };
  const sel = raw as Selection;
  const selection: Selection = { xi: [...sel.xi].sort((a, b) => a - b), plan: sel.plan };

  const after = replaySeason(row.state.seed, [...row.state.selections, selection]);
  if (!after) return { ok: false, error: 'That team could not be played.', status: 400 };
  const over = isOver(after);
  const played = row.state.played ?? row.state.selections.length;

  // Claim the match: only the request that still sees the old count gets to move it on
  const next: State = { seed: row.state.seed, selections: [...row.state.selections, selection], lastMatch: ctx.today, played: played + 1 };
  const { data: claimed, error } = await ctx.admin
    .from('game_plays')
    .update({ state: next, finished: over, score: after.reports.filter((m) => m.won).length })
    .eq('id', row.id).eq('finished', false).eq('state->>played', String(played))
    .select('id');
  if (error || !claimed?.length) return { ok: false, error: "You have played today's match. The next one is tomorrow.", status: 409 };

  const report = after.reports[after.reports.length - 1];
  let amount = 0, bonus = 0, capped = false;
  const pay = async (reference: string, multiplier: number) => {
    const award = await awardScores(userId, ctx.clubId!, RULE, reference, multiplier);
    if (award.ok) { capped = capped || !!award.capped; return award.amount ?? 0; }
    if (award.error === 'weekly_cap_reached') capped = true;
    return 0;
  };
  if (ctx.pays && report.won) amount = await pay(`${row.id}:${report.match}`, 1);
  const finalPlace = place(after);
  if (ctx.pays && over && PLACE_BONUS[finalPlace - 1]) bonus = await pay(`${row.id}:final`, PLACE_BONUS[finalPlace - 1]);
  if (amount + bonus > 0) await ctx.admin.from('game_plays').update({ amount: row.amount + amount + bonus }).eq('id', row.id);

  // Winning the league counts toward a scratch card where the club rewards games
  const card = over && finalPlace === 1 ? await countTowardCard(ctx, userId, `manager:${row.id}`) : false;
  return { ok: true, report, amount, bonus, capped, over, place: finalPlace, card };
}
