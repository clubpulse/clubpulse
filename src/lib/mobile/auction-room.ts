// Server-only. The daily Auction Room game for the mobile app.
//
// The app plays the auction itself (it is a timing game against computer rivals, so it cannot
// wait on the network for every bid) and sends back how each lot went. The server made the seed,
// so it rebuilds the same players and rivals and checks every lot could have gone that way before
// paying anything. Someone reading the app's code could work out what the rivals will pay, which
// lets them play well, not invent a result; the reward is small and counts toward the weekly cap.

import { randomInt } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { AWARD_ERRORS, awardScores, getPrimaryClubId, ukToday } from '@/lib/scores/context';
import { PLACE_MULTIPLIER, POOL_SIZE, replayGame, type LotResult } from '@/lib/games/auction-engine';

const GAME = 'auction';
const RULE = 'game_auction';
/** A fresh set of players each start, so quitting to see the order again gains nothing. */
export const MAX_STARTS_PER_DAY = 3;

type PlayState = { seed?: number; starts?: number; place?: number };
type PlayRow = { id: string; state: PlayState; finished: boolean; score: number; amount: number };

export type AuctionRoomStatus = {
  /** Why the paid daily game is unavailable (practice still works), or null. */
  unavailable: string | null;
  /** Scores for 1st, 2nd, 3rd and 4th place at this club. */
  prizes: number[];
  startsLeft: number;
  played: { place: number; score: number; amount: number } | null;
};

type Failure = { ok: false; error: string; status: number };

async function context(userId: string) {
  const admin = createAdminClient();
  const clubId = await getPrimaryClubId(userId);
  if (!clubId) return { admin, clubId: null, value: 0, enabled: false, today: ukToday() };

  const [{ data: rule }, { data: override }] = await Promise.all([
    admin.from('scores_rules').select('default_amount').eq('source', RULE).maybeSingle(),
    admin.from('club_scores_rules').select('amount, is_enabled').eq('club_id', clubId).eq('source', RULE).maybeSingle(),
  ]);
  return {
    admin,
    clubId,
    value: (override?.amount as number | null | undefined) ?? (rule?.default_amount as number | undefined) ?? 0,
    // No rule row means the database change for this game has not been applied yet
    enabled: !!rule && (override ? (override.is_enabled as boolean) : true),
    ruleMissing: !rule,
    today: ukToday(),
  };
}

async function todaysPlay(admin: ReturnType<typeof createAdminClient>, userId: string, today: string): Promise<PlayRow | null> {
  const { data } = await admin
    .from('game_plays')
    .select('id, state, finished, score, amount')
    .eq('user_id', userId)
    .eq('game', GAME)
    .eq('play_date', today)
    .maybeSingle();
  return (data as PlayRow | null) ?? null;
}

function unavailableReason(ctx: Awaited<ReturnType<typeof context>>): string | null {
  if (!ctx.clubId) return 'Join a club to earn Scores from the daily auction. Practice is open to everyone.';
  if (ctx.ruleMissing) return 'The daily auction is not switched on yet. Practice is open.';
  if (!ctx.enabled) return 'Your club has switched off Scores for this game. Practice is open.';
  return null;
}

export async function getAuctionRoomStatus(userId: string): Promise<AuctionRoomStatus> {
  const ctx = await context(userId);
  const prizes = PLACE_MULTIPLIER.map((m) => m * ctx.value);
  const unavailable = unavailableReason(ctx);
  if (unavailable) return { unavailable, prizes, startsLeft: 0, played: null };

  const play = await todaysPlay(ctx.admin, userId, ctx.today);
  return {
    unavailable: null,
    prizes,
    startsLeft: Math.max(0, MAX_STARTS_PER_DAY - (play?.state.starts ?? 0)),
    played: play?.finished ? { place: play.state.place ?? 4, score: play.score, amount: play.amount } : null,
  };
}

export async function startAuctionRoom(
  userId: string,
): Promise<{ ok: true; seed: number; startsLeft: number } | Failure> {
  const ctx = await context(userId);
  const unavailable = unavailableReason(ctx);
  if (unavailable || !ctx.clubId) return { ok: false, error: unavailable ?? AWARD_ERRORS.not_member, status: 403 };

  const seed = randomInt(1, 2_147_483_647);
  const play = await todaysPlay(ctx.admin, userId, ctx.today);

  if (!play) {
    const { error } = await ctx.admin
      .from('game_plays')
      .insert({ user_id: userId, club_id: ctx.clubId, game: GAME, play_date: ctx.today, state: { seed, starts: 1 } });
    // A unique violation means another request started today's game a moment ago
    if (error) return { ok: false, error: 'Could not start the auction. Please try again.', status: 409 };
    return { ok: true, seed, startsLeft: MAX_STARTS_PER_DAY - 1 };
  }

  if (play.finished) return { ok: false, error: "You have already played today's auction.", status: 409 };
  const starts = play.state.starts ?? 0;
  if (starts >= MAX_STARTS_PER_DAY) {
    return { ok: false, error: "You have used all of today's starts. Practice is still open.", status: 409 };
  }

  // Only move on from the state we read, so two starts at once cannot both count as one
  const { data: updated, error } = await ctx.admin
    .from('game_plays')
    .update({ state: { seed, starts: starts + 1 } })
    .eq('id', play.id)
    .eq('finished', false)
    .eq('state->>seed', String(play.state.seed ?? ''))
    .select('id');
  if (error || !updated?.length) return { ok: false, error: 'Could not start the auction. Please try again.', status: 409 };
  return { ok: true, seed, startsLeft: MAX_STARTS_PER_DAY - starts - 1 };
}

/** Reads the results the app sent. Returns null unless it is exactly one well-formed result per lot. */
export function parseResults(body: unknown): LotResult[] | null {
  const raw = (body as { results?: unknown } | null)?.results;
  if (!Array.isArray(raw) || raw.length !== POOL_SIZE) return null;
  const out: LotResult[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const { winner, price } = item as { winner?: unknown; price?: unknown };
    if (winner !== null && !(typeof winner === 'number' && Number.isInteger(winner))) return null;
    if (!(typeof price === 'number' && Number.isInteger(price) && price >= 0 && price <= 1000)) return null;
    out.push({ winner: winner as number | null, price });
  }
  return out;
}

export async function finishAuctionRoom(
  userId: string,
  results: LotResult[],
): Promise<{ ok: true; place: number; score: number; amount: number; capped: boolean } | Failure> {
  const ctx = await context(userId);
  const unavailable = unavailableReason(ctx);
  if (unavailable || !ctx.clubId) return { ok: false, error: unavailable ?? AWARD_ERRORS.not_member, status: 403 };

  const play = await todaysPlay(ctx.admin, userId, ctx.today);
  if (!play || typeof play.state.seed !== 'number') {
    return { ok: false, error: "Today's auction was not started, or it started before midnight. No Scores for this one.", status: 409 };
  }
  if (play.finished) return { ok: false, error: "You have already played today's auction.", status: 409 };

  const replay = replayGame(play.state.seed, results);
  if (!replay.ok) return { ok: false, error: 'That result does not match the auction you were given.', status: 400 };

  // Claim the finish first: only one request can flip finished, so the award below runs once
  const { data: claimed, error: claimError } = await ctx.admin
    .from('game_plays')
    .update({ finished: true, score: replay.score, state: { ...play.state, place: replay.place } })
    .eq('id', play.id)
    .eq('finished', false)
    .eq('state->>seed', String(play.state.seed))
    .select('id');
  if (claimError || !claimed?.length) {
    return { ok: false, error: "You have already played today's auction.", status: 409 };
  }

  let amount = 0;
  let capped = false;
  const multiplier = PLACE_MULTIPLIER[replay.place - 1] ?? 0;
  if (multiplier > 0) {
    const award = await awardScores(userId, ctx.clubId, RULE, ctx.today, multiplier);
    if (award.ok) {
      amount = award.amount ?? 0;
      capped = !!award.capped;
    } else if (award.error === 'weekly_cap_reached') {
      capped = true;
    }
    if (amount > 0) await ctx.admin.from('game_plays').update({ amount }).eq('id', play.id);
  }
  return { ok: true, place: replay.place, score: replay.score, amount, capped };
}
