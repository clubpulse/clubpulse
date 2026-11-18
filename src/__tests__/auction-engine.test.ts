import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BUDGET, MARQUEE_COUNT, MAX_OVERSEAS, OBJECTIVE_POINTS, POOL_SIZE, REQUIRED, ROLES, SQUAD_SIZE, TEAM_COUNT, UNCAPPED_REQUIRED,
  advance, allPlayers, cannotBuy, currentLimits, currentLot, formatMoney, generatePool, generateRivals,
  isBidLevel, newAuction, nextBid, objectives, overseasCount, replayGame, rivalOrder, squadScore,
  type Auction, type Lot, type LotResult, type Team,
} from '@/lib/games/auction-engine';

type Strategy = (lot: Lot, me: Team) => number;

/** Plays a whole auction the way the app does: rivals raise in turn, the player raises up to their limit. */
function playGame(seed: number, userMax: Strategy): { results: LotResult[]; auction: Auction } {
  const pool = generatePool(seed);
  const rivals = generateRivals(seed);
  let a = newAuction(pool);
  const results: LotResult[] = [];
  while (!a.done) {
    const lot = currentLot(pool, a);
    const limits = currentLimits(seed, rivals, pool, a);
    const order = rivalOrder(seed, lot, a.round);
    const max = userMax(lot, a.teams[0]);
    let price = 0;
    let holder = -1;
    for (;;) {
      const next = holder === -1 ? lot.base : nextBid(price);
      const rival = order.find((r) => r + 1 !== holder && limits[r] >= next);
      if (rival !== undefined) {
        price = next;
        holder = rival + 1;
      } else if (holder !== 0 && next <= max && !cannotBuy(a.teams[0], lot, next)) {
        price = next;
        holder = 0;
      } else break;
    }
    const result = holder === -1 ? { winner: null, price: 0 } : { winner: holder, price };
    results.push(result);
    a = advance(pool, a, result);
  }
  return { results, auction: a };
}

describe('auction engine', () => {
  it('is the same file in the app and on the server', () => {
    const root = join(__dirname, '..', '..');
    const server = readFileSync(join(root, 'src/lib/games/auction-engine.ts'), 'utf8');
    const app = readFileSync(join(root, 'expo/lib/auctionEngine.ts'), 'utf8');
    expect(app).toBe(server);
  });

  it('has a clean player list with enough of every role for six squads', () => {
    const players = allPlayers();
    expect(players).toHaveLength(POOL_SIZE);
    expect(new Set(players.map((p) => p.name)).size).toBe(POOL_SIZE);
    players.forEach((p) => {
      expect(p.rating).toBeGreaterThanOrEqual(60);
      expect(p.rating).toBeLessThanOrEqual(99);
      expect(p.overseas).toBe(p.country !== 'India');
    });
    ROLES.forEach((role) => {
      expect(players.filter((p) => p.role === role).length).toBeGreaterThanOrEqual(REQUIRED[role] * TEAM_COUNT);
    });
    // Enough home players that the overseas limit can never leave a squad short
    expect(players.filter((p) => !p.overseas).length).toBeGreaterThanOrEqual((SQUAD_SIZE - MAX_OVERSEAS) * TEAM_COUNT);
  });

  it('builds the same auction from the same seed, in a different order on a different day', () => {
    expect(generatePool(42)).toEqual(generatePool(42));
    expect(generateRivals(42)).toEqual(generateRivals(42));
    expect(generatePool(42).map((p) => p.name)).not.toEqual(generatePool(43).map((p) => p.name));
    const pool = generatePool(42);
    expect(pool.slice(0, MARQUEE_COUNT).every((p) => p.set === 'Marquee set')).toBe(true);
    expect(Math.min(...pool.slice(0, MARQUEE_COUNT).map((p) => p.rating))).toBeGreaterThanOrEqual(
      Math.max(...pool.slice(MARQUEE_COUNT).map((p) => p.rating)),
    );
  });

  it('walks the bidding ladder and formats money', () => {
    expect([30, 90, 100, 175, 200, 450, 500, 900, 1000].map(nextBid)).toEqual([40, 100, 125, 200, 250, 500, 600, 1000, 1200]);
    expect(isBidLevel(50, 125)).toBe(true);
    expect(isBidLevel(50, 110)).toBe(false);
    expect(isBidLevel(200, 150)).toBe(false);
    expect([30, 100, 150, 1250, 10000].map(formatMoney)).toEqual(['₹30 L', '₹1 cr', '₹1.5 cr', '₹12.5 cr', '₹100 cr']);
  });

  it('accepts every honestly played game', () => {
    const styles: Strategy[] = [() => 0, (lot) => lot.base, () => 600, (_, me) => me.purse];
    for (let seed = 1; seed <= 60; seed++) {
      for (const style of styles) {
        const { results } = playGame(seed * 7919, style);
        expect(replayGame(seed * 7919, results)).toMatchObject({ ok: true });
      }
    }
  });

  it('keeps every franchise inside its purse, squad size and overseas limit', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { auction } = playGame(seed, (_, me) => me.purse);
      auction.teams.forEach((t) => {
        expect(t.purse).toBeGreaterThanOrEqual(0);
        expect(t.squad.length).toBeLessThanOrEqual(SQUAD_SIZE);
        expect(overseasCount(t)).toBeLessThanOrEqual(MAX_OVERSEAS);
      });
    }
  });

  it('lets the rival franchises fill their squads and meet the objectives', () => {
    let full = 0;
    let total = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const { auction } = playGame(seed * 31, () => 0);
      auction.teams.slice(1).forEach((t) => {
        total += 1;
        if (objectives(t).every((o) => o.met)) full += 1;
      });
    }
    expect(full / total).toBeGreaterThan(0.95);
  });

  it('has uncapped Indian players, and an objective for signing them', () => {
    const players = allPlayers();
    const uncapped = players.filter((p) => p.uncapped);
    // Enough for every franchise to meet the objective several times over
    expect(uncapped.length).toBeGreaterThanOrEqual(UNCAPPED_REQUIRED * TEAM_COUNT * 2);
    expect(uncapped.every((p) => !p.overseas && p.country === 'India')).toBe(true);
    // Stars of the national side are not marked uncapped by mistake
    for (const name of ['Virat Kohli', 'Jasprit Bumrah', 'Hardik Pandya', 'Tilak Varma']) {
      expect(players.find((p) => p.name === name)!.uncapped).toBe(false);
    }

    const pick = (n: number, wanted: boolean) => players.filter((p) => p.uncapped === wanted).slice(0, n).map((p, id) => ({ ...p, id, set: '' }));
    const goal = (squad: ReturnType<typeof pick>) => objectives({ purse: 0, squad }).find((o) => o.key === 'uncapped')!;
    expect(goal(pick(5, false))).toMatchObject({ have: 0, need: UNCAPPED_REQUIRED, met: false });
    expect(goal([...pick(5, false), ...pick(1, true)])).toMatchObject({ have: 1, met: false });
    expect(goal(pick(UNCAPPED_REQUIRED, true))).toMatchObject({ have: UNCAPPED_REQUIRED, met: true });
  });

  it('brings the uncapped players up as their own set, straight after the marquee set', () => {
    const pool = generatePool(77);
    const sets = pool.map((p) => p.set).filter((set, i, all) => set !== all[i - 1]);
    expect(sets.slice(0, 2)).toEqual(['Marquee set', 'Uncapped players']);
    expect(pool.filter((p) => p.set === 'Uncapped players').every((p) => p.uncapped)).toBe(true);
    // Any uncapped player good enough for the marquee set stays there
    expect(pool.filter((p) => p.uncapped && p.set !== 'Uncapped players').every((p) => p.set === 'Marquee set')).toBe(true);
  });

  it('rejects games that could not have happened', () => {
    const seed = 2026;
    const pool = generatePool(seed);
    const honest = playGame(seed, () => 0).results;

    // Taking the first marquee player at base price
    expect(replayGame(seed, honest.map((r, i) => (i === 0 ? { winner: 0, price: pool[0].base } : r)))).toMatchObject({ ok: false, lot: 0 });
    // Too few and too many results
    expect(replayGame(seed, honest.slice(0, -1))).toMatchObject({ ok: false });
    expect(replayGame(seed, [...honest, { winner: null, price: 0 }])).toMatchObject({ ok: false });
    // A price that is not on the ladder
    const offLadder = honest.map((r, i) => (i === 0 ? { winner: r.winner, price: r.price + 1 } : r));
    expect(replayGame(seed, offLadder)).toMatchObject({ ok: false, lot: 0 });
  });

  it('scores a squad as player points plus a bonus per objective met', () => {
    expect(squadScore({ purse: BUDGET, squad: [] })).toBe(0);
    const pool = generatePool(7);
    const batters = pool.filter((p) => p.role === 'BAT').slice(0, 4);
    const points = batters.reduce((a, p) => a + p.rating, 0);
    // Four batters meet one objective: the batting one
    expect(objectives({ purse: 0, squad: batters }).filter((o) => o.met)).toHaveLength(1);
    expect(squadScore({ purse: 0, squad: batters })).toBe(points + OBJECTIVE_POINTS);
  });
});
