import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUCTION_SLOTS, BUDGET, MAX_OVERSEAS, POOL_SIZE, RETAINED_COUNT, SQUAD_SIZE, TEAM_COUNT,
  advance, cannotBuy, currentLimits, currentLot, formatMoney, generatePool, generateRetained, generateRivals,
  isBidLevel, newAuction, nextBid, overseasCount, replayGame, rivalOrder, squadScore, totalShortfall,
  type Auction, type Lot, type LotResult, type Team,
} from '@/lib/games/auction-engine';

type Strategy = (lot: Lot, me: Team) => number;

/** Plays a whole auction the way the app does: rivals raise in turn, the player raises up to their limit. */
function playGame(seed: number, userMax: Strategy): { results: LotResult[]; auction: Auction } {
  const pool = generatePool(seed);
  const rivals = generateRivals(seed);
  let a = newAuction(pool, generateRetained(seed));
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

  it('builds the same auction from the same seed', () => {
    expect(generatePool(42)).toEqual(generatePool(42));
    expect(generateRetained(42)).toEqual(generateRetained(42));
    expect(generateRivals(42)).toEqual(generateRivals(42));
    expect(generatePool(42)).not.toEqual(generatePool(43));
  });

  it('builds a pool and retained squads that fit the rules', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const pool = generatePool(seed);
      const retained = generateRetained(seed);
      expect(pool).toHaveLength(POOL_SIZE);
      expect(pool[0].set).toBe('Marquee set');
      expect(retained).toHaveLength(TEAM_COUNT);
      const names = [...pool, ...retained.flat()].map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
      retained.forEach((squad) => {
        expect(squad).toHaveLength(RETAINED_COUNT);
        expect(squad.filter((p) => p.overseas).length).toBeLessThanOrEqual(2);
      });
      // Uncapped players are never overseas
      pool.filter((p) => p.set === 'Uncapped players').forEach((p) => expect(p.overseas).toBe(false));
    }
  });

  it('walks the bidding ladder and formats money', () => {
    expect([30, 90, 100, 175, 200, 450, 500, 900, 1000].map(nextBid)).toEqual([40, 100, 125, 200, 250, 500, 600, 1000, 1200]);
    expect(isBidLevel(50, 125)).toBe(true);
    expect(isBidLevel(50, 110)).toBe(false);
    expect(isBidLevel(200, 150)).toBe(false);
    expect([30, 100, 150, 1250, 5000].map(formatMoney)).toEqual(['₹30 L', '₹1 cr', '₹1.5 cr', '₹12.5 cr', '₹50 cr']);
  });

  it('accepts every honestly played game', () => {
    const styles: Strategy[] = [() => 0, (lot) => lot.base, () => 600, (_, me) => me.purse];
    for (let seed = 1; seed <= 120; seed++) {
      for (const style of styles) {
        const { results } = playGame(seed * 7919, style);
        expect(replayGame(seed * 7919, results)).toMatchObject({ ok: true });
      }
    }
  });

  it('keeps every franchise inside its purse, its XI and the overseas limit', () => {
    for (let seed = 1; seed <= 120; seed++) {
      const { auction } = playGame(seed, (_, me) => me.purse);
      auction.teams.forEach((t) => {
        expect(t.purse).toBeGreaterThanOrEqual(0);
        expect(t.purse).toBeLessThanOrEqual(BUDGET);
        expect(t.squad.length).toBeLessThanOrEqual(SQUAD_SIZE);
        expect(overseasCount(t)).toBeLessThanOrEqual(MAX_OVERSEAS);
      });
    }
  });

  it('brings unsold players back once, in the accelerated round', () => {
    const seed = 99;
    const { results } = playGame(seed, () => 0);
    const pool = generatePool(seed);
    const unsoldFirstTime = results.slice(0, POOL_SIZE).filter((r) => r.winner === null).length;
    expect(results).toHaveLength(POOL_SIZE + unsoldFirstTime);
    let a = newAuction(pool, generateRetained(seed));
    results.slice(0, POOL_SIZE).forEach((r) => {
      a = advance(pool, a, r);
    });
    expect(a.round).toBe(unsoldFirstTime > 0 ? 2 : 1);
  });

  it('rejects games that could not have happened', () => {
    const seed = 2026;
    const pool = generatePool(seed);
    const honest = playGame(seed, () => 0).results;

    // Winning the first five lots at base price
    const greedy = honest.map((r, i) => (i < AUCTION_SLOTS ? { winner: 0, price: pool[i].base } : r));
    expect(replayGame(seed, greedy)).toMatchObject({ ok: false, lot: 0 });
    // Too few and too many results
    expect(replayGame(seed, honest.slice(0, -1))).toMatchObject({ ok: false });
    expect(replayGame(seed, [...honest, { winner: null, price: 0 }])).toMatchObject({ ok: false });
    // A price that is not on the ladder
    const offLadder = honest.map((r, i) => (i === 0 ? { winner: r.winner, price: r.price + 1 } : r));
    expect(replayGame(seed, offLadder)).toMatchObject({ ok: false, lot: 0 });
  });

  it('scores a squad from its ratings, empty places and missing roles', () => {
    const retained = generateRetained(7)[0];
    const team: Team = { purse: BUDGET, squad: retained };
    const total = retained.reduce((a, p) => a + p.rating, 0) + AUCTION_SLOTS * 40;
    const expected = Math.round((total / SQUAD_SIZE - 3 * totalShortfall(team)) * 10) / 10;
    expect(squadScore(team)).toBe(expected);
  });
});
