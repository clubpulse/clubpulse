// Auction Room: a T20 franchise auction in the style of the IPL's. Six franchises each have a
// pretend ₹100 crore purse and bid for real players to build a squad of 15 that meets a set of
// objectives. Every player is worth points; the squad with the most points wins. One game a day
// pays Scores to the top three; practice games are unlimited and pay nothing. The purse only
// exists inside the game. Franchises are invented; players appear by name, country and role only.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Hammer, ObjectiveMeter, Paddles, PlayerAvatar, PulsingPrice, SoldStamp } from '../components/auction/AuctionVisuals';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../lib/api';
import {
  BUDGET, ENGINE_VERSION, MAX_OVERSEAS, MIN_BASE, OBJECTIVE_POINTS, UNCAPPED_REQUIRED, ROLE_LABEL, ROLES, SQUAD_SIZE, TEAM_COUNT,
  advance, cannotBuy, currentLimits, currentLot, formatMoney, generatePool, generateRivals,
  newAuction, nextBid, objectives, overseasCount, rivalOrder, shortfall, squadScore, standings, totalShortfall, upcomingLots,
  type Auction, type Lot, type LotResult, type Rival, type Role, type Standing, type Team,
} from '../lib/auctionEngine';
import { colors, fonts, radius, spacing } from '../constants/theme';

type Status = {
  /** The server's version of the game. Missing on a server older than the app. */
  engine?: number;
  unavailable: string | null;
  prizes: number[];
  startsLeft: number;
  played: { place: number; score: number; amount: number } | null;
};
type Mode = 'daily' | 'practice';
type Bidding = {
  price: number;
  holder: number; // -1 = no bid yet, 0 = the player, 1.. = rivals
  count: number; // 0 = open, 1 = going once, 2 = going twice
  userOut: boolean;
  done: boolean;
  /** The most each rival will pay for this lot, and the order they bid in. Fixed when the lot opens. */
  limits: number[];
  order: number[];
};
type Game = {
  mode: Mode;
  seed: number;
  pool: Lot[];
  rivals: Rival[];
  auction: Auction;
  results: LotResult[];
  bid: Bidding | null; // null once the auction is over
};
type Payout =
  | { state: 'practice' }
  | { state: 'saving' }
  | { state: 'paid'; amount: number; capped: boolean }
  | { state: 'failed'; message: string };

const ROLE_SHORT: Record<Role, string> = { BAT: 'BAT', WK: 'WK', AR: 'A-R', PACE: 'PACE', SPIN: 'SPIN' };
const ROLE_COLOR: Record<Role, string> = {
  BAT: colors.brandSky,
  WK: colors.gold,
  AR: colors.success,
  PACE: colors.orange,
  SPIN: '#C084FC',
};
function ordinal(n: number): string {
  const tail = n % 100;
  if (tail >= 11 && tail <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

function openLot(seed: number, rivals: Rival[], pool: Lot[], auction: Auction): Bidding | null {
  if (auction.done) return null;
  return {
    price: 0,
    holder: -1,
    count: 0,
    userOut: false,
    done: false,
    limits: currentLimits(seed, rivals, pool, auction),
    order: rivalOrder(seed, currentLot(pool, auction), auction.round),
  };
}

function newGame(mode: Mode, seed: number): Game {
  const pool = generatePool(seed);
  const rivals = generateRivals(seed);
  const auction = newAuction(pool);
  return { mode, seed, pool, rivals, auction, results: [], bid: openLot(seed, rivals, pool, auction) };
}

function teamName(game: Game, team: number): string {
  return team === 0 ? 'You' : game.rivals[team - 1].name;
}

/** The bid the next bidder has to make. */
function askingPrice(lot: Lot, bid: Bidding): number {
  return bid.holder === -1 ? lot.base : nextBid(bid.price);
}

/** The rival who raises next, or undefined if none of them will. */
function nextRival(lot: Lot, bid: Bidding): number | undefined {
  const ask = askingPrice(lot, bid);
  return bid.order.find((r) => r + 1 !== bid.holder && bid.limits[r] >= ask);
}

function resultOf(bid: Bidding): LotResult {
  return bid.holder === -1 ? { winner: null, price: 0 } : { winner: bid.holder, price: bid.price };
}

/** Lets the rivals finish the lot between themselves from where the bidding stands. */
function settled(lot: Lot, bid: Bidding): Bidding {
  let out = bid;
  for (;;) {
    const rival = nextRival(lot, out);
    if (rival === undefined) return { ...out, done: true };
    out = { ...out, price: askingPrice(lot, out), holder: rival + 1, count: 0 };
  }
}

/** Records the lot on the block and opens the next one. */
function moveOn(game: Game): Game {
  if (!game.bid) return game;
  const result = resultOf(game.bid);
  const auction = advance(game.pool, game.auction, result);
  return { ...game, auction, results: [...game.results, result], bid: openLot(game.seed, game.rivals, game.pool, auction) };
}

export default function AuctionRoomScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [payout, setPayout] = useState<Payout>({ state: 'practice' });
  // Auction pace. Normal leaves time to read each player and follow the bidding; fast is for
  // people who know the pool and want to get through it.
  const [fast, setFast] = useState(false);

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

  const finished = !!game && game.auction.done;
  const bidding = !!game && !finished;

  // ── The auctioneer: decides what happens next and when ─────────────────────
  useEffect(() => {
    if (!game || !game.bid || game.auction.done) return;
    const bid = game.bid;
    const lot = currentLot(game.pool, game.auction);
    const me = game.auction.teams[0];
    const pace = fast ? 0.4 : 1;
    const set = (next: Bidding, delay: number) => {
      const timer = setTimeout(() => setGame((g) => (g && g.bid === bid ? { ...g, bid: next } : g)), delay * pace);
      return () => clearTimeout(timer);
    };

    if (bid.done) {
      // Long enough to see who bought the player and for how much; longer when it was the player's own lot
      const mine = bid.holder === 0 || !bid.userOut;
      const timer = setTimeout(() => setGame((g) => (g && g.bid === bid ? moveOn(g) : g)), (mine ? 2600 : 1700) * pace);
      return () => clearTimeout(timer);
    }

    const ask = askingPrice(lot, bid);
    const userCanBid = bid.holder !== 0 && !bid.userOut && !cannotBuy(me, lot, ask);
    // With the player out of it, the rivals settle the lot at once
    if (!userCanBid && bid.holder !== 0) return set(settled(lot, { ...bid, userOut: true }), 700);

    const rival = nextRival(lot, bid);
    if (rival !== undefined) {
      return set({ ...bid, price: ask, holder: rival + 1, count: 0 }, 1100 + Math.random() * 900);
    }
    // Nobody else will raise: going once, going twice, sold
    if (bid.count >= 2) return set({ ...bid, done: true }, bid.holder === 0 ? 1200 : 1600);
    // The first pause on a lot nobody has bid on is longer, so there is time to read it
    const pause = bid.holder === 0 ? 1400 : bid.count === 0 ? (bid.price === 0 ? 4000 : 2400) : 1600;
    return set({ ...bid, count: bid.count + 1 }, pause);
  }, [game, fast]);

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
      const { seed } = await api<{ seed: number }>('/api/games/auction-room', { method: 'POST', body: { engine: ENGINE_VERSION } });
      setPayout({ state: 'practice' }); // flips to saving when the game ends
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
      if (!g || !g.bid || g.auction.done) return g;
      const lot = currentLot(g.pool, g.auction);
      const ask = askingPrice(lot, g.bid);
      if (g.bid.done || g.bid.userOut || g.bid.holder === 0 || cannotBuy(g.auction.teams[0], lot, ask)) return g;
      return { ...g, bid: { ...g.bid, price: ask, holder: 0, count: 0 } };
    });

  const pass = () =>
    setGame((g) => {
      if (!g || !g.bid || g.bid.done || g.bid.holder === 0) return g;
      return { ...g, bid: settled(currentLot(g.pool, g.auction), { ...g.bid, userOut: true }) };
    });

  const skipToEnd = () =>
    setGame((g) => {
      let out = g;
      while (out && out.bid) {
        const lot = currentLot(out.pool, out.auction);
        out = moveOn({ ...out, bid: out.bid.done ? out.bid : settled(lot, { ...out.bid, userOut: true }) });
      }
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
      {game && game.bid && !finished && (
        <BiddingView game={game} bid={game.bid} onBid={placeBid} onPass={pass} onSkip={skipToEnd} fast={fast} onToggleFast={() => setFast((f) => !f)} />
      )}
      {game && finished && (
        <ResultView
          game={game}
          payout={payout}
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
  // The daily game is checked by the server, so both have to be playing the same version of it
  const outOfDate = !!status && status.engine !== undefined && status.engine !== ENGINE_VERSION;
  const canPlayDaily = !!status && !outOfDate && !status.unavailable && !status.played && status.startsLeft > 0;
  const paidPlaces = status ? status.prizes.map((amount, i) => ({ amount, place: i + 1 })).filter((p) => p.amount > 0) : [];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={{ fontSize: 44 }}>🔨</Text>
        <Text style={[fonts.heading, { marginTop: spacing.sm }]}>Auction Room</Text>
        <Text style={[fonts.small, { textAlign: 'center', marginTop: 4 }]}>
          A T20 franchise auction. Six franchises, ₹100 crore each, and everyone wants the same players.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={fonts.title}>How it works</Text>
        <Rule n="1" text={`You have a ${formatMoney(BUDGET)} purse to sign a squad of ${SQUAD_SIZE}. The purse only exists in this game.`} />
        <Rule n="2" text="Players come up in sets: marquee first, then batters, all-rounders, wicketkeepers, fast bowlers, spinners and value picks. Tap Bid to raise the paddle, or Pass to let the others fight it out." />
        <Rule n="3" text="Every player is worth points. Your team points are your players' points added together." />
        <Rule n="4" text={`Objectives: sign all ${SQUAD_SIZE}, with at least 4 batters, 2 wicketkeepers, 3 all-rounders, 3 fast bowlers, 2 spinners and ${UNCAPPED_REQUIRED} uncapped players. An uncapped player counts for their role too. Each objective met adds ${OBJECTIVE_POINTS} points.`} />
        <Rule n="5" text={`No more than ${MAX_OVERSEAS} overseas players. Unsold players come back once in an accelerated round.`} />
        <Rule n="6" text="The franchise with the most team points wins. The top three earn Scores in the daily game." />
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
        {outOfDate && (
          <Text style={[fonts.small, { marginTop: spacing.sm, color: colors.orange }]}>
            The player pool has been updated. Update the ClubPulse app to play today&apos;s auction. Practice still works.
          </Text>
        )}
        {status && !status.unavailable && (
          <>
            <View style={styles.prizeRow}>
              {paidPlaces.map((p) => (
                <View key={p.place} style={styles.prize}>
                  <Text style={styles.prizeAmount}>⭐ {p.amount}</Text>
                  <Text style={fonts.small}>{ordinal(p.place)}</Text>
                </View>
              ))}
            </View>
            {status.played ? (
              <Text style={[fonts.regular, { marginTop: spacing.md }]}>
                Played today: {ordinal(status.played.place)} of {TEAM_COUNT} with {status.played.score} team points
                {status.played.amount > 0 ? `, ${status.played.amount} Scores earned.` : '.'} Back tomorrow for a new
                auction.
              </Text>
            ) : status.startsLeft > 0 ? (
              <Text style={[fonts.small, { marginTop: spacing.md }]}>
                One game a day counts for Scores. Leaving part-way uses a start and you get a new auction next time:{' '}
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

function BiddingView(props: {
  game: Game; bid: Bidding; onBid: () => void; onPass: () => void; onSkip: () => void; fast: boolean; onToggleFast: () => void;
}) {
  const { game, bid } = props;
  const { pool, auction } = game;
  const lot = currentLot(pool, auction);
  const me = auction.teams[0];
  // The moment the hammer falls on a lot the player has won, show it in the squad, the purse
  // and the objectives. The auction's own record catches up when the next player comes up.
  const shown: Team = bid.done && bid.holder === 0
    ? { ...me, purse: me.purse - bid.price, squad: [...me.squad, lot] }
    : me;
  const ask = askingPrice(lot, bid);
  const short = shortfall(me);
  const need = totalShortfall(me);
  const slots = SQUAD_SIZE - me.squad.length;
  const blocked = cannotBuy(me, lot, ask);
  const canBid = !bid.done && !bid.userOut && bid.holder !== 0 && !blocked;
  const canPass = !bid.done && !bid.userOut && bid.holder !== 0;
  const cannotBuyAgain = slots === 0 || me.purse < MIN_BASE;
  const upcoming = upcomingLots(pool, auction);
  const left = ROLES.map((r) => ({ role: r, count: upcoming.filter((p) => p.role === r).length }));

  // Who has the bid, and the auctioneer's call while the hammer is coming down
  let holderLine = 'Base price';
  if (bid.done) holderLine = bid.holder === -1 ? 'Unsold' : `Sold to ${bid.holder === 0 ? 'you' : teamName(game, bid.holder)}`;
  else if (bid.holder === 0) holderLine = 'You hold the bid';
  else if (bid.holder !== -1) holderLine = `${teamName(game, bid.holder)} holds the bid`;
  else if (bid.count > 0) holderLine = 'No bids yet';
  const call = bid.done || bid.count === 0 ? '' : bid.count === 1 ? 'Going once…' : 'Going twice…';

  let hint = '';
  if (bid.done) hint = '';
  else if (slots === 0) hint = 'Your squad is complete.';
  else if (bid.userOut) hint = 'You passed on this player.';
  else if (bid.holder === 0) hint = 'Your bid. Waiting on the other franchises.';
  else if (blocked === 'overseas limit reached') hint = `You already have ${MAX_OVERSEAS} overseas players.`;
  else if (blocked === 'not enough purse') hint = `You can't afford ${formatMoney(ask)}.`;
  else if (short[lot.role] === 0 && slots <= need) hint = `Careful: your last ${slots === 1 ? 'place is' : `${slots} places are`} needed to meet your objectives.`;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Text style={fonts.small}>
            {auction.round === 2 ? 'Accelerated round' : lot.set} · {upcoming.length} to come
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable onPress={props.onToggleFast} accessibilityRole="button"
              accessibilityLabel={props.fast ? 'Auction speed fast. Switch to normal speed.' : 'Auction speed normal. Switch to fast.'}
              style={[styles.modePill, props.fast && { backgroundColor: colors.brandPrimaryDim }]}>
              <Text style={[styles.modePillText, props.fast && { color: colors.brandSky }]}>
                <Ionicons name={props.fast ? 'play-forward' : 'play'} size={11} /> {props.fast ? 'Fast' : 'Normal'}
              </Text>
            </Pressable>
            <View style={[styles.modePill, game.mode === 'daily' && { backgroundColor: colors.goldDim }]}>
              <Text style={[styles.modePillText, game.mode === 'daily' && { color: colors.gold }]}>
                {game.mode === 'daily' ? 'Daily' : 'Practice'}
              </Text>
            </View>
          </View>
        </View>

        {/* The player on the block */}
        <View style={[styles.card, styles.lotCard, bid.done && bid.holder === 0 && { borderColor: colors.success }]}>
          <View style={styles.lotHead}>
            <PlayerAvatar name={lot.name} country={lot.country} role={lot.role} roleColor={ROLE_COLOR[lot.role]} lotKey={lot.id} />
            <View style={{ flex: 1 }}>
              <View style={styles.pillRow}>
                <View style={[styles.rolePill, { backgroundColor: `${ROLE_COLOR[lot.role]}22` }]}>
                  <Text style={[styles.rolePillText, { color: ROLE_COLOR[lot.role] }]}>{ROLE_LABEL[lot.role]}</Text>
                </View>
                {lot.uncapped && (
                  <View style={[styles.rolePill, { backgroundColor: 'rgba(34,197,94,0.14)' }]}>
                    <Text style={[styles.rolePillText, { color: colors.success }]}>Uncapped</Text>
                  </View>
                )}
                {lot.overseas && (
                  <View style={[styles.rolePill, { backgroundColor: colors.surface2 }]}>
                    <Text style={[styles.rolePillText, { color: colors.text }]}>✈ Overseas</Text>
                  </View>
                )}
              </View>
              <Text style={styles.lotName} numberOfLines={2} adjustsFontSizeToFit>{lot.name}</Text>
              <Text style={fonts.small}>
                {lot.flag} {lot.country} · base {formatMoney(lot.base)}
              </Text>
            </View>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingNum}>{lot.rating}</Text>
              <Text style={styles.ratingLabel}>POINTS</Text>
            </View>
          </View>

          <View style={styles.bidBox}>
            <PulsingPrice text={formatMoney(bid.holder === -1 ? lot.base : bid.price)} value={bid.holder === -1 ? 0 : bid.price} />
            <Text style={[fonts.small, bid.done && bid.holder === 0 && { color: colors.success, fontWeight: '700' }]}>{holderLine}</Text>
            <View style={styles.callRow}>
              <Hammer count={bid.count} done={bid.done} />
              <Text style={styles.callText}>{call || ' '}</Text>
            </View>
          </View>

          {/* Who is in the room: the paddle holding the bid is raised */}
          <Paddles names={['You', ...game.rivals.map((r) => r.name)]} holder={bid.holder} out={bid.userOut} />

          <SoldStamp show={bid.done} sold={bid.holder !== -1} mine={bid.holder === 0}
            line={bid.holder === -1 ? 'Back in the accelerated round' : `${bid.holder === 0 ? 'You' : teamName(game, bid.holder)} · ${formatMoney(bid.price)}`} />
        </View>

        {/* Your franchise */}
        <View style={styles.card}>
          <View style={styles.topRow}>
            <Text style={fonts.title}>Your squad</Text>
            <Text style={styles.purse}>{formatMoney(shown.purse)} left</Text>
          </View>
          <View style={styles.slotRow}>
            {Array.from({ length: SQUAD_SIZE }, (_, i) => {
              const p = shown.squad[i];
              return (
                <View key={i} style={[styles.slot, p && { borderColor: ROLE_COLOR[p.role], borderStyle: 'solid' }]}>
                  {p ? (
                    <>
                      <Text style={[styles.slotRole, { color: ROLE_COLOR[p.role] }]}>
                        {ROLE_SHORT[p.role]}
                        {p.overseas ? ' ✈' : ''}
                        {p.uncapped ? ' U' : ''}
                      </Text>
                      <View style={styles.slotPlayer}>
                        <PlayerAvatar name={p.name} country={p.country} role={p.role} roleColor={ROLE_COLOR[p.role]} size={22} plain />
                        <Text style={styles.slotRating}>{p.rating}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.slotEmpty}>+</Text>
                  )}
                </View>
              );
            })}
          </View>
          <Text style={[fonts.small, { marginTop: spacing.sm }]}>
            {SQUAD_SIZE - shown.squad.length} place{SQUAD_SIZE - shown.squad.length === 1 ? '' : 's'} to fill · overseas {overseasCount(shown)}/{MAX_OVERSEAS} · {squadScore(shown)} team points
          </Text>
          <ObjectiveList team={shown} lot={slots > 0 && !bid.done ? lot : undefined} />
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
          {upcoming.slice(0, 4).map((p, i) => (
            <Text key={p.id} style={[fonts.small, { marginTop: 4 }]} numberOfLines={1}>
              {i === 0 ? 'Next: ' : ''}
              {p.name}
              {p.overseas ? ' ✈' : ''}{p.uncapped ? ' · uncapped' : ''} · {ROLE_LABEL[p.role]} · {p.rating} pts
            </Text>
          ))}
          {auction.round === 1 && auction.unsold.length > 0 && (
            <Text style={[fonts.small, { marginTop: spacing.sm }]}>
              {auction.unsold.length} unsold so far. They return in the accelerated round.
            </Text>
          )}
        </View>

        {/* Rivals */}
        <View style={styles.card}>
          <Text style={fonts.title}>Other franchises</Text>
          {game.rivals.map((rival, r) => {
            const team = auction.teams[r + 1];
            const holding = bid.holder === r + 1;
            return (
              <View key={rival.name} style={styles.rivalRow}>
                <Ionicons name={holding ? 'hammer' : 'shield-outline'} size={13} color={holding ? colors.gold : colors.textSubtle} />
                <Text style={[styles.rivalName, holding && { color: colors.gold, fontWeight: '700' }]} numberOfLines={1}>
                  {rival.name}
                </Text>
                <Text style={fonts.small}>
                  {SQUAD_SIZE - team.squad.length} to fill · {formatMoney(team.purse)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actionBar}>
        {!!hint && <Text style={[fonts.small, { textAlign: 'center', marginBottom: spacing.sm }]}>{hint}</Text>}
        {cannotBuyAgain ? (
          <Pressable onPress={props.onSkip} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Skip to the result</Text>
          </Pressable>
        ) : (
          <View style={styles.actionRow}>
            <Pressable onPress={props.onPass} disabled={!canPass} style={[styles.passBtn, !canPass && { opacity: 0.35 }]}>
              <Text style={styles.passBtnText}>Pass</Text>
            </Pressable>
            <Pressable onPress={props.onBid} disabled={!canBid} style={[styles.bidBtn, !canBid && { opacity: 0.35 }]}>
              <Text style={styles.bidBtnText}>Bid {formatMoney(ask)}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// The squad's targets with live counts. The ones the player on the block would help are picked out.
function ObjectiveList({ team, lot }: { team: Team; lot?: Lot }) {
  return (
    <View style={styles.objectiveWrap}>
      {objectives(team).map((o) => (
        <ObjectiveMeter key={o.key} label={o.short} have={o.have} need={o.need} met={o.met}
          wouldHelp={lot !== undefined && (o.key === 'squad' || o.key === lot.role || (o.key === 'uncapped' && lot.uncapped))} />
      ))}
    </View>
  );
}

// ── Result ───────────────────────────────────────────────────────────────────

function ResultView(props: {
  game: Game;
  payout: Payout;
  onRetrySave: () => void;
  onPractice: () => void;
  onLobby: () => void;
  onHome: () => void;
}) {
  const { game, payout } = props;
  const teams = game.auction.teams;
  const table: Standing[] = useMemo(() => standings(game.rivals, teams), [game.rivals, teams]);
  const mine = table.find((row) => row.team === 0)!;
  const me = teams[0];
  // What the player paid for each player they bought, by replaying the order the lots came up in
  const paid = useMemo(() => {
    const prices = new Map<number, number>();
    let a = newAuction(game.pool);
    game.results.forEach((r) => {
      if (a.done) return;
      if (r.winner === 0) prices.set(currentLot(game.pool, a).id, r.price);
      a = advance(game.pool, a, r);
    });
    return prices;
  }, [game.results, game.pool]);
  const met = objectives(me).filter((o) => o.met).length;
  const trophy = mine.place === 1 ? '🏆' : mine.place === 2 ? '🥈' : mine.place === 3 ? '🥉' : '🏏';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={{ fontSize: 44 }}>{trophy}</Text>
        <Text style={[fonts.big, { marginTop: spacing.xs }]}>{ordinal(mine.place)}</Text>
        <Text style={fonts.small}>
          of {TEAM_COUNT} franchises · {mine.score} team points
        </Text>
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
                : 'Scores go to the top three. A new auction opens tomorrow.'}
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
            <Text style={fonts.small}>{formatMoney(row.purse)} left</Text>
            <Text style={[styles.tableScore, row.team === 0 && { color: colors.gold }]}>{row.score}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={fonts.title}>Your squad</Text>
        {me.squad.length === 0 && <Text style={[fonts.small, { marginTop: spacing.sm }]}>You didn&apos;t sign anyone.</Text>}
        {me.squad.map((p) => (
          <View key={p.id} style={styles.tableRow}>
            <Text style={[styles.slotRole, { color: ROLE_COLOR[p.role], width: 40 }]}>{ROLE_SHORT[p.role]}</Text>
            <Text style={[fonts.regular, { flex: 1 }]} numberOfLines={1}>
              {p.name}
              {p.overseas ? ' ✈' : ''}
            </Text>
            <Text style={fonts.small}>{formatMoney(paid.get(p.id) ?? 0)}</Text>
            <Text style={styles.tableScore}>{p.rating}</Text>
          </View>
        ))}
        <ObjectiveList team={me} />
        <Text style={[fonts.small, { marginTop: spacing.sm }]}>
          Players {squadScore(me) - met * OBJECTIVE_POINTS} + objectives {met * OBJECTIVE_POINTS} = {squadScore(me)} team points
        </Text>
        <Text style={[fonts.small, { marginTop: spacing.sm }]}>{formatMoney(me.purse)} of your purse unspent</Text>
      </View>

      <Pressable onPress={props.onPractice} style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>Play a practice auction</Text>
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
  prizeAmount: { color: colors.gold, fontSize: 16, fontWeight: '800' },

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
  lotHead: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  pillRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  rolePill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  rolePillText: { fontSize: 12, fontWeight: '800' },
  lotName: { color: colors.white, fontSize: 24, fontWeight: '800', marginTop: spacing.sm },
  ratingBox: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minWidth: 68,
  },
  ratingNum: { color: colors.white, fontSize: 30, fontWeight: '800' },
  ratingLabel: { color: colors.textMuted as string, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  bidBox: { alignItems: 'center', marginTop: spacing.lg, minHeight: 104 },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4, minHeight: 26 },
  bidPrice: { color: colors.gold, fontSize: 40, fontWeight: '800' },
  callText: { color: colors.orange, fontSize: 16, fontWeight: '800' },

  purse: { color: colors.gold, fontSize: 16, fontWeight: '800' },
  slotPlayer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slotRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  slot: {
    width: '18%', height: 46, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.navyBorder, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  slotRole: { fontSize: 10, fontWeight: '800' },
  slotRating: { color: colors.white, fontSize: 15, fontWeight: '800' },
  slotEmpty: { color: colors.textSubtle, fontSize: 18 },

  rivalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 10 },
  rivalName: { flex: 1, fontSize: 14, color: colors.text },
  leftRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.xs },
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
  tablePlace: { color: colors.textMuted as string, fontSize: 15, fontWeight: '800', width: 20 },
  tableScore: { color: colors.white, fontSize: 16, fontWeight: '800', width: 48, textAlign: 'right' },

  objectiveWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: spacing.md },
  objectiveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '50%', marginTop: 6 },
  objectiveText: { color: colors.textMuted as string, fontSize: 12, flexShrink: 1 },
});
