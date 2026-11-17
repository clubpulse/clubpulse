// Auction Room: bid a pretend 100k budget against three computer-run franchises to build a
// five-player squad. One game a day pays Scores for where the squad finishes; practice games
// are unlimited and pay nothing. The budget only exists inside the game.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../lib/api';
import {
  BUDGET, POOL_SIZE, ROLE_LABEL, ROLES, SQUAD_SIZE, applyResult, generatePool, generateRivals, missingRoles,
  newTeams, nextBid, rivalLimits, rivalOrder, squadScore, standings,
  type Lot, type LotResult, type Rival, type Role, type Standing, type Team,
} from '../lib/auctionEngine';
import { colors, fonts, radius, spacing } from '../constants/theme';

type Status = {
  unavailable: string | null;
  prizes: number[];
  startsLeft: number;
  played: { place: number; score: number; amount: number } | null;
};
type Mode = 'daily' | 'practice';
type Bidding = { price: number; holder: number; count: number; userOut: boolean; done: boolean };
type Game = {
  mode: Mode;
  seed: number;
  pool: Lot[];
  rivals: Rival[];
  teams: Team[];
  index: number;
  results: LotResult[];
  bid: Bidding;
};
type Payout =
  | { state: 'practice' }
  | { state: 'saving' }
  | { state: 'paid'; amount: number; capped: boolean }
  | { state: 'failed'; message: string };

const NEW_BID: Bidding = { price: 0, holder: -1, count: 0, userOut: false, done: false };
const ROLE_SHORT: Record<Role, string> = { BAT: 'BAT', BOWL: 'BWL', AR: 'A-R', WK: 'WK' };
const ROLE_COLOR: Record<Role, string> = { BAT: colors.brandSky, BOWL: colors.orange, AR: colors.success, WK: colors.gold };
const PLACE = ['1st', '2nd', '3rd', '4th'];
const k = (n: number) => `${n}k`;

function newGame(mode: Mode, seed: number): Game {
  return {
    mode,
    seed,
    pool: generatePool(seed),
    rivals: generateRivals(seed),
    teams: newTeams(),
    index: 0,
    results: [],
    bid: NEW_BID,
  };
}

function teamName(game: Game, team: number): string {
  return team === 0 ? 'You' : game.rivals[team - 1].name;
}

/** The bid the next bidder has to make. */
function askingPrice(lot: Lot, bid: Bidding): number {
  return bid.holder === -1 ? lot.base : nextBid(bid.price);
}

function resultOf(bid: Bidding): LotResult {
  return bid.holder === -1 ? { winner: null, price: 0 } : { winner: bid.holder, price: bid.price };
}

/** Lets the rivals finish the current lot between themselves. */
function settleLot(game: Game): LotResult {
  const lot = game.pool[game.index];
  const limits = rivalLimits(game.seed, game.pool, game.teams, game.index);
  const order = rivalOrder(game.seed, game.index);
  let { price, holder } = game.bid;
  for (;;) {
    const ask = holder === -1 ? lot.base : nextBid(price);
    const rival = order.find((r) => r + 1 !== holder && limits[r] >= ask);
    if (rival === undefined) return resultOf({ ...game.bid, price, holder });
    price = ask;
    holder = rival + 1;
  }
}

/** Records the current lot and moves to the next one. */
function withResult(game: Game, result: LotResult): Game {
  return {
    ...game,
    teams: applyResult(game.teams, game.pool[game.index], result),
    results: [...game.results, result],
    index: game.index + 1,
    bid: NEW_BID,
  };
}

export default function AuctionRoomScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [payout, setPayout] = useState<Payout>({ state: 'practice' });

  const loadStatus = useCallback(async () => {
    setStatusError(null);
    try {
      setStatus(await api<Status>('/api/games/auction-room'));
    } catch (e) {
      setStatus(null);
      setStatusError(e instanceof ApiError ? e.message : 'Could not load the daily auction.');
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const finished = !!game && game.index >= game.pool.length;
  const bidding = !!game && !finished;

  // ── The auctioneer: decides what happens next and when ─────────────────────
  useEffect(() => {
    if (!game || game.index >= game.pool.length) return;
    const { bid, teams, pool, index, seed } = game;
    const lot = pool[index];
    const me = teams[0];

    if (bid.done) {
      const canStillBuy = me.squad.length < SQUAD_SIZE && me.purse >= 2;
      const timer = setTimeout(() => setGame((g) => (g ? withResult(g, resultOf(g.bid)) : g)), canStillBuy ? 1500 : 700);
      return () => clearTimeout(timer);
    }

    const ask = askingPrice(lot, bid);
    const limits = rivalLimits(seed, pool, teams, index);
    const rival = rivalOrder(seed, index).find((r) => r + 1 !== bid.holder && limits[r] >= ask);
    const userCanBid = bid.holder !== 0 && !bid.userOut && me.squad.length < SQUAD_SIZE && me.purse >= ask;
    const userInvolved = userCanBid || bid.holder === 0;

    let delay: number;
    let next: Bidding;
    if (rival !== undefined) {
      // A rival raises. Quick when the player is out of it, a beat slower when they are in.
      delay = userInvolved ? 650 + Math.random() * 500 : 220;
      next = { ...bid, price: ask, holder: rival + 1, count: 0 };
    } else if (!userInvolved) {
      // Nobody left who can bid
      delay = 350;
      next = { ...bid, done: true };
    } else if (bid.count >= (bid.holder === 0 ? 2 : 3)) {
      delay = 0;
      next = { ...bid, done: true };
    } else {
      // Going once, going twice. The first pause on a fresh lot is longer so there is time to read it.
      delay = bid.holder === 0 ? 700 : bid.count === 0 ? (bid.price === 0 ? 2600 : 1700) : 1100;
      next = { ...bid, count: bid.count + 1 };
    }
    const timer = setTimeout(() => setGame((g) => (g && g.bid === bid ? { ...g, bid: next } : g)), delay);
    return () => clearTimeout(timer);
  }, [game]);

  // ── Send the finished daily game to be checked and paid ────────────────────
  const submit = useCallback(async (results: LotResult[]) => {
    setPayout({ state: 'saving' });
    try {
      const res = await api<{ amount: number; capped: boolean }>('/api/games/auction-room/finish', {
        method: 'POST',
        body: { results },
      });
      setPayout({ state: 'paid', amount: res.amount, capped: res.capped });
    } catch (e) {
      setPayout({ state: 'failed', message: e instanceof ApiError ? e.message : 'Could not save your result.' });
    }
  }, []);

  useEffect(() => {
    if (game && finished && game.mode === 'daily' && payout.state === 'practice') submit(game.results);
  }, [game, finished, payout.state, submit]);

  const startDaily = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const { seed } = await api<{ seed: number }>('/api/games/auction-room', { method: 'POST' });
      setPayout({ state: 'practice' }); // reset; flips to saving when the game ends
      setGame(newGame('daily', seed));
    } catch (e) {
      setStartError(e instanceof ApiError ? e.message : 'Could not start the auction.');
      loadStatus();
    } finally {
      setStarting(false);
    }
  };

  const startPractice = () => {
    setPayout({ state: 'practice' });
    setStartError(null);
    setGame(newGame('practice', 1 + Math.floor(Math.random() * 2_000_000_000)));
  };

  const backToLobby = () => {
    setGame(null);
    loadStatus();
  };

  const placeBid = () =>
    setGame((g) => {
      if (!g || g.index >= g.pool.length) return g;
      const lot = g.pool[g.index];
      const ask = askingPrice(lot, g.bid);
      const me = g.teams[0];
      if (g.bid.done || g.bid.userOut || g.bid.holder === 0 || me.squad.length >= SQUAD_SIZE || me.purse < ask) return g;
      return { ...g, bid: { ...g.bid, price: ask, holder: 0, count: 0 } };
    });

  const pass = () =>
    setGame((g) => (g && !g.bid.done && g.bid.holder !== 0 ? { ...g, bid: { ...g.bid, userOut: true } } : g));

  const skipToEnd = () =>
    setGame((g) => {
      if (!g) return g;
      let out: Game = { ...g, bid: { ...g.bid, userOut: true } };
      // If the player holds the bid on the current lot it stands unless a rival can raise it
      while (out.index < out.pool.length) out = withResult(out, out.bid.done ? resultOf(out.bid) : settleLot(out));
      return out;
    });

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* No swipe-back mid-auction: leaving a daily game uses up one of the day's starts */}
      <Stack.Screen options={{ gestureEnabled: !bidding }} />
      {!game && (
        <Lobby
          status={status}
          statusError={statusError}
          starting={starting}
          startError={startError}
          onDaily={startDaily}
          onPractice={startPractice}
          onRetry={loadStatus}
        />
      )}
      {game && bidding && <BiddingView game={game} onBid={placeBid} onPass={pass} onSkip={skipToEnd} />}
      {game && finished && (
        <ResultView
          game={game}
          payout={payout}
          prizes={status?.prizes ?? null}
          onRetrySave={() => submit(game.results)}
          onPractice={startPractice}
          onLobby={backToLobby}
          onHome={() => router.back()}
        />
      )}
    </SafeAreaView>
  );
}

// ── Lobby ────────────────────────────────────────────────────────────────────

function Lobby(props: {
  status: Status | null;
  statusError: string | null;
  starting: boolean;
  startError: string | null;
  onDaily: () => void;
  onPractice: () => void;
  onRetry: () => void;
}) {
  const { status, statusError, starting, startError } = props;
  const loading = !status && !statusError;
  const canPlayDaily = !!status && !status.unavailable && !status.played && status.startsLeft > 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={{ fontSize: 44 }}>🔨</Text>
        <Text style={[fonts.heading, { marginTop: spacing.sm }]}>Auction Room</Text>
        <Text style={[fonts.small, { textAlign: 'center', marginTop: 4 }]}>
          Build the best five-player squad. Three rival franchises want the same players.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={fonts.title}>How it works</Text>
        <Rule n="1" text={`Everyone starts with a ${k(BUDGET)} budget. It only exists in this game.`} />
        <Rule n="2" text={`${POOL_SIZE} players come up one at a time. Tap Bid to raise, or Pass to sit a player out.`} />
        <Rule n="3" text="Your squad needs a batter, a bowler, an all-rounder and a keeper. Each one missing costs 6 points." />
        <Rule n="4" text="Your squad score is the average rating of your five. An empty slot counts as 40." />
        <Rule n="5" text="Highest squad score of the four franchises wins." />
      </View>

      <View style={[styles.card, { borderColor: colors.goldBorder }]}>
        <Text style={fonts.title}>Today&apos;s auction</Text>
        {loading && <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.md }} />}
        {statusError && (
          <>
            <Text style={[fonts.small, { marginTop: spacing.sm }]}>{statusError}</Text>
            <Pressable onPress={props.onRetry} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Try again</Text>
            </Pressable>
          </>
        )}
        {status?.unavailable && <Text style={[fonts.small, { marginTop: spacing.sm }]}>{status.unavailable}</Text>}
        {status && !status.unavailable && (
          <>
            <View style={styles.prizeRow}>
              {status.prizes.slice(0, 3).map((p, i) => (
                <View key={PLACE[i]} style={styles.prize}>
                  <Text style={styles.prizeAmount}>⭐ {p}</Text>
                  <Text style={fonts.small}>{PLACE[i]}</Text>
                </View>
              ))}
            </View>
            {status.played ? (
              <Text style={[fonts.regular, { marginTop: spacing.md }]}>
                Played today: {PLACE[status.played.place - 1]} with a squad score of {status.played.score}
                {status.played.amount > 0 ? `, ${status.played.amount} Scores earned.` : '.'} Back tomorrow for a new
                auction.
              </Text>
            ) : status.startsLeft > 0 ? (
              <Text style={[fonts.small, { marginTop: spacing.md }]}>
                One game a day counts for Scores. Leaving part-way uses a start and you get new players next time:{' '}
                {status.startsLeft} start{status.startsLeft === 1 ? '' : 's'} left today.
              </Text>
            ) : (
              <Text style={[fonts.small, { marginTop: spacing.md }]}>
                You have used all of today&apos;s starts. Practice is still open.
              </Text>
            )}
          </>
        )}
        {startError && <Text style={[fonts.small, { color: colors.danger, marginTop: spacing.sm }]}>{startError}</Text>}
        {canPlayDaily && (
          <Pressable onPress={props.onDaily} disabled={starting} style={[styles.primaryBtn, starting && { opacity: 0.6 }]}>
            {starting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryBtnText}>Play today&apos;s auction</Text>}
          </Pressable>
        )}
      </View>

      <Pressable onPress={props.onPractice} style={styles.secondaryBtn}>
        <Text style={styles.secondaryBtnText}>Practice (no Scores)</Text>
      </Pressable>
    </ScrollView>
  );
}

function Rule({ n, text }: { n: string; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={styles.ruleNum}>
        <Text style={styles.ruleNumText}>{n}</Text>
      </View>
      <Text style={[fonts.small, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

// ── Bidding ──────────────────────────────────────────────────────────────────

function BiddingView({ game, onBid, onPass, onSkip }: { game: Game; onBid: () => void; onPass: () => void; onSkip: () => void }) {
  const { pool, index, teams, bid } = game;
  const lot = pool[index];
  const me = teams[0];
  const ask = askingPrice(lot, bid);
  const squadFull = me.squad.length >= SQUAD_SIZE;
  const cannotBuyAgain = squadFull || me.purse < 2;
  const canBid = !bid.done && !bid.userOut && bid.holder !== 0 && !squadFull && me.purse >= ask;
  const canPass = !bid.done && !bid.userOut && bid.holder !== 0 && !squadFull;
  const need = missingRoles(me);
  const upcoming = pool.slice(index + 1);
  const left = ROLES.map((r) => ({ role: r, count: upcoming.filter((p) => p.role === r).length }));

  // Who has the bid, and the auctioneer's call while the hammer is coming down
  let holderLine = 'Opening bid';
  if (bid.done) holderLine = bid.holder === -1 ? 'Unsold' : `Sold to ${bid.holder === 0 ? 'you' : teamName(game, bid.holder)}`;
  else if (bid.holder === 0) holderLine = 'You hold the bid';
  else if (bid.holder !== -1) holderLine = `${teamName(game, bid.holder)} holds the bid`;
  else if (bid.count > 0) holderLine = 'No bids yet';
  const call = bid.done || bid.count === 0 ? '' : bid.count === 1 ? 'Going once…' : 'Going twice…';

  let hint = '';
  if (squadFull) hint = 'Your squad is full.';
  else if (bid.userOut) hint = 'You passed on this player.';
  else if (bid.holder === 0) hint = 'Your bid. Waiting on the rivals.';
  else if (me.purse < ask) hint = `You can't afford ${k(ask)}.`;
  else if (!need.includes(lot.role) && SQUAD_SIZE - me.squad.length <= need.length) hint = `Careful: you still need ${need.map((r) => ROLE_LABEL[r].toLowerCase()).join(', ')}.`;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={fonts.small}>
            Lot {index + 1} of {pool.length}
          </Text>
          <View style={[styles.modePill, game.mode === 'daily' && { backgroundColor: colors.goldDim }]}>
            <Text style={[styles.modePillText, game.mode === 'daily' && { color: colors.gold }]}>
              {game.mode === 'daily' ? 'Daily' : 'Practice'}
            </Text>
          </View>
        </View>

        {/* The player on the block */}
        <View style={[styles.card, styles.lotCard, bid.done && bid.holder === 0 && { borderColor: colors.success }]}>
          <View style={styles.lotHead}>
            <View style={{ flex: 1 }}>
              <View style={[styles.rolePill, { backgroundColor: `${ROLE_COLOR[lot.role]}22` }]}>
                <Text style={[styles.rolePillText, { color: ROLE_COLOR[lot.role] }]}>{ROLE_LABEL[lot.role]}</Text>
              </View>
              <Text style={styles.lotName}>{lot.name}</Text>
              <Text style={fonts.small}>{lot.trait}</Text>
            </View>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingNum}>{lot.rating}</Text>
              <Text style={styles.ratingLabel}>RATING</Text>
            </View>
          </View>

          <View style={styles.bidBox}>
            <Text style={styles.bidPrice}>{bid.holder === -1 ? k(lot.base) : k(bid.price)}</Text>
            <Text style={fonts.small}>{holderLine}</Text>
            {!!call && <Text style={styles.callText}>{call}</Text>}
          </View>
        </View>

        {/* Your franchise */}
        <View style={styles.card}>
          <View style={styles.topRow}>
            <Text style={fonts.title}>Your squad</Text>
            <Text style={styles.purse}>{k(me.purse)} left</Text>
          </View>
          <View style={styles.slotRow}>
            {Array.from({ length: SQUAD_SIZE }, (_, i) => {
              const p = me.squad[i];
              return (
                <View key={i} style={[styles.slot, p && { borderColor: ROLE_COLOR[p.role], borderStyle: 'solid' }]}>
                  {p ? (
                    <>
                      <Text style={[styles.slotRole, { color: ROLE_COLOR[p.role] }]}>{ROLE_SHORT[p.role]}</Text>
                      <Text style={styles.slotRating}>{p.rating}</Text>
                    </>
                  ) : (
                    <Text style={styles.slotEmpty}>+</Text>
                  )}
                </View>
              );
            })}
          </View>
          <Text style={[fonts.small, { marginTop: spacing.sm }]}>
            {need.length === 0 ? 'All four roles covered.' : `Still need: ${need.map((r) => ROLE_LABEL[r].toLowerCase()).join(', ')}`}
          </Text>
        </View>

        {/* Rivals */}
        <View style={styles.card}>
          <Text style={fonts.title}>Rivals</Text>
          {game.rivals.map((rival, r) => {
            const team = teams[r + 1];
            const holding = bid.holder === r + 1;
            return (
              <View key={rival.name} style={styles.rivalRow}>
                <Ionicons name={holding ? 'hammer' : 'shield-outline'} size={14} color={holding ? colors.gold : colors.textSubtle} />
                <Text style={[fonts.regular, { flex: 1 }, holding && { color: colors.gold, fontWeight: '700' }]} numberOfLines={1}>
                  {rival.name}
                </Text>
                <Text style={fonts.small}>
                  {team.squad.length}/{SQUAD_SIZE} · {k(team.purse)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* What is still to come */}
        <View style={styles.card}>
          <Text style={fonts.title}>Still to come ({upcoming.length})</Text>
          <View style={styles.leftRow}>
            {left.map(({ role, count }) => (
              <Text key={role} style={[styles.leftChip, { color: ROLE_COLOR[role] }]}>
                {count} {ROLE_SHORT[role]}
              </Text>
            ))}
          </View>
          {upcoming.slice(0, 3).map((p, i) => (
            <Text key={p.id} style={[fonts.small, { marginTop: 4 }]} numberOfLines={1}>
              {i === 0 ? 'Next: ' : ''}
              {p.name} · {ROLE_LABEL[p.role]} · {p.rating}
            </Text>
          ))}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actionBar}>
        {!!hint && <Text style={[fonts.small, { textAlign: 'center', marginBottom: spacing.sm }]}>{hint}</Text>}
        {cannotBuyAgain ? (
          <Pressable onPress={onSkip} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Skip to the result</Text>
          </Pressable>
        ) : (
          <View style={styles.actionRow}>
            <Pressable onPress={onPass} disabled={!canPass} style={[styles.passBtn, !canPass && { opacity: 0.35 }]}>
              <Text style={styles.passBtnText}>Pass</Text>
            </Pressable>
            <Pressable onPress={onBid} disabled={!canBid} style={[styles.bidBtn, !canBid && { opacity: 0.35 }]}>
              <Text style={styles.bidBtnText}>Bid {k(ask)}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Result ───────────────────────────────────────────────────────────────────

function ResultView(props: {
  game: Game;
  payout: Payout;
  prizes: number[] | null;
  onRetrySave: () => void;
  onPractice: () => void;
  onLobby: () => void;
  onHome: () => void;
}) {
  const { game, payout } = props;
  const table: Standing[] = useMemo(() => standings(game.seed, game.teams), [game.seed, game.teams]);
  const mine = table.find((row) => row.team === 0)!;
  const me = game.teams[0];
  const paid = useMemo(() => {
    const prices = new Map<number, number>();
    game.results.forEach((r, i) => {
      if (r.winner === 0) prices.set(game.pool[i].id, r.price);
    });
    return prices;
  }, [game.results, game.pool]);
  const need = missingRoles(me);
  const empty = SQUAD_SIZE - me.squad.length;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={{ fontSize: 44 }}>{mine.place === 1 ? '🏆' : mine.place === 2 ? '🥈' : mine.place === 3 ? '🥉' : '🏏'}</Text>
        <Text style={[fonts.big, { marginTop: spacing.xs }]}>{PLACE[mine.place - 1]}</Text>
        <Text style={fonts.small}>of four franchises · squad score {mine.score}</Text>
      </View>

      <View style={[styles.card, { borderColor: colors.goldBorder }]}>
        {payout.state === 'practice' && <Text style={fonts.regular}>Practice game. No Scores for this one.</Text>}
        {payout.state === 'saving' && (
          <View style={styles.cardRow}>
            <ActivityIndicator color={colors.gold} />
            <Text style={fonts.regular}>Checking your result…</Text>
          </View>
        )}
        {payout.state === 'paid' && (
          <Text style={fonts.regular}>
            {payout.amount > 0
              ? `⭐ ${payout.amount} Scores earned${payout.capped ? ' (your weekly limit trimmed this)' : ''}.`
              : payout.capped
                ? "You've reached your club's weekly Scores limit, so nothing was added. It resets on Monday."
                : 'No Scores for 4th place. A new auction opens tomorrow.'}
          </Text>
        )}
        {payout.state === 'failed' && (
          <>
            <Text style={[fonts.regular, { color: colors.danger }]}>{payout.message}</Text>
            <Pressable onPress={props.onRetrySave} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Try again</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={fonts.title}>Final table</Text>
        {table.map((row) => (
          <View key={row.team} style={styles.tableRow}>
            <Text style={[styles.tablePlace, row.team === 0 && { color: colors.gold }]}>{row.place}</Text>
            <Text style={[fonts.regular, { flex: 1 }, row.team === 0 && { color: colors.gold, fontWeight: '700' }]} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={fonts.small}>{k(row.purse)} left</Text>
            <Text style={styles.tableScore}>{row.score}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={fonts.title}>Your squad</Text>
        {me.squad.length === 0 && <Text style={[fonts.small, { marginTop: spacing.sm }]}>You didn&apos;t buy anyone.</Text>}
        {me.squad.map((p) => (
          <View key={p.id} style={styles.tableRow}>
            <Text style={[styles.slotRole, { color: ROLE_COLOR[p.role], width: 34 }]}>{ROLE_SHORT[p.role]}</Text>
            <Text style={[fonts.regular, { flex: 1 }]} numberOfLines={1}>
              {p.name}
            </Text>
            <Text style={fonts.small}>{k(paid.get(p.id) ?? 0)}</Text>
            <Text style={styles.tableScore}>{p.rating}</Text>
          </View>
        ))}
        {(empty > 0 || need.length > 0) && (
          <Text style={[fonts.small, { marginTop: spacing.sm }]}>
            {empty > 0 ? `${empty} empty slot${empty === 1 ? '' : 's'} counted as 40. ` : ''}
            {need.length > 0 ? `No ${need.map((r) => ROLE_LABEL[r].toLowerCase()).join(' or ')}: −${need.length * 6}.` : ''}
          </Text>
        )}
        <Text style={[fonts.small, { marginTop: spacing.sm }]}>
          Squad score {squadScore(me)} · {k(me.purse)} unspent
        </Text>
      </View>

      <Pressable onPress={props.onPractice} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>Play a practice game</Text>
      </Pressable>
      <Pressable onPress={props.onLobby} style={styles.secondaryBtn}>
        <Text style={styles.secondaryBtnText}>Back to the Auction Room</Text>
      </Pressable>
      <Pressable onPress={props.onHome} style={[styles.secondaryBtn, { borderWidth: 0 }]}>
        <Text style={[styles.secondaryBtnText, { color: colors.textMuted as string }]}>Done</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  card: {
    backgroundColor: colors.surface1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.navyBorder,
    padding: spacing.lg,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  ruleRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'flex-start' },
  ruleNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.brandPrimaryDim,
    alignItems: 'center', justifyContent: 'center',
  },
  ruleNumText: { color: colors.brandSky, fontSize: 12, fontWeight: '700' },

  prizeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  prize: { flex: 1, alignItems: 'center', backgroundColor: colors.goldDim, borderRadius: radius.md, paddingVertical: spacing.md },
  prizeAmount: { color: colors.gold, fontSize: 18, fontWeight: '800' },

  primaryBtn: {
    backgroundColor: colors.gold, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', marginTop: spacing.md,
  },
  primaryBtnText: { color: colors.background, fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, paddingVertical: 13, alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryBtnText: { color: colors.brandSky, fontSize: 15, fontWeight: '700' },

  modePill: { backgroundColor: colors.surface2, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  modePillText: { color: colors.textMuted as string, fontSize: 12, fontWeight: '700' },

  lotCard: { borderColor: colors.brandPrimary },
  lotHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  rolePill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  rolePillText: { fontSize: 12, fontWeight: '800' },
  lotName: { color: colors.white, fontSize: 24, fontWeight: '800', marginTop: spacing.sm },
  ratingBox: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minWidth: 68,
  },
  ratingNum: { color: colors.white, fontSize: 30, fontWeight: '800' },
  ratingLabel: { color: colors.textMuted as string, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  bidBox: { alignItems: 'center', marginTop: spacing.lg, minHeight: 96 },
  bidPrice: { color: colors.gold, fontSize: 44, fontWeight: '800' },
  callText: { color: colors.orange, fontSize: 16, fontWeight: '800', marginTop: 2 },

  purse: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  slotRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  slot: {
    flex: 1, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  slotRole: { fontSize: 11, fontWeight: '800' },
  slotRating: { color: colors.white, fontSize: 16, fontWeight: '800' },
  slotEmpty: { color: colors.textSubtle, fontSize: 18 },

  rivalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  leftRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xs },
  leftChip: { fontSize: 13, fontWeight: '800' },

  actionBar: {
    padding: spacing.lg, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  passBtn: {
    flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.navyBorder, paddingVertical: 16, alignItems: 'center',
  },
  passBtnText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  bidBtn: { flex: 2, borderRadius: radius.md, backgroundColor: colors.gold, paddingVertical: 16, alignItems: 'center' },
  bidBtnText: { color: colors.background, fontSize: 18, fontWeight: '800' },

  tableRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  tablePlace: { color: colors.textMuted as string, fontSize: 15, fontWeight: '800', width: 18 },
  tableScore: { color: colors.white, fontSize: 16, fontWeight: '800', width: 34, textAlign: 'right' },
});
