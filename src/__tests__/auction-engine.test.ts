import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BUDGET, POOL_SIZE, SQUAD_SIZE, applyResult, generatePool, generateRivals, isBidLevel, newTeams, nextBid,
  replayGame, rivalLimits, rivalOrder, squadScore, type LotResult, type Team,
} from '@/lib/games/auction-engine';

/** Plays one lot the way the app does: rivals raise in turn, the player raises up to userMax. */
function playLot(seed: number, teams: Team[], i: number, userMax: number): LotResult {
  const pool = generatePool(seed);
  const lot = pool[i];
  const limits = rivalLimits(seed, pool, teams, i);
  const order = rivalOrder(seed, i);
  let price = 0;
  let holder = -1;
  for (;;) {
    const next = holder === -1 ? lot.base : nextBid(price);
    const rival = order.find((r) => r + 1 !== holder && limits[r] >= next);
    if (rival !== undefined) {
      price = next;
      holder = rival + 1;
      continue;
    }
    if (holder !== 0 && teams[0].squad.length < SQUAD_SIZE && next <= userMax && next <= teams[0].purse) {
      price = next;
      holder = 0;
      continue;
    }
    return holder === -1 ? { winner: null, price: 0 } : { winner: holder, price };
  }
}

function playGame(seed: number, userMax: (i: number, teams: Team[]) => number) {
  const pool = generatePool(seed);
  let teams = newTeams();
  const results: LotResult[] = [];
  for (let i = 0; i < pool.length; i++) {
    const result = playLot(seed, teams, i, userMax(i, teams));
    results.push(result);
    teams = applyResult(teams, pool[i], result);
  }
  return { results, teams };
}

describe('auction engine', () => {
  it('is the same file in the app and on the server', () => {
    const root = join(__dirname, '..', '..');
    const server = readFileSync(join(root, 'src/lib/games/auction-engine.ts'), 'utf8');
    const app = readFileSync(join(root, 'expo/lib/auctionEngine.ts'), 'utf8');
    expect(app).toBe(server);
  });

  it('builds the same pool and rivals from the same seed', () => {
    expect(generatePool(42)).toEqual(generatePool(42));
    expect(generateRivals(42)).toEqual(generateRivals(42));
    expect(generatePool(42)).not.toEqual(generatePool(43));
  });

  it('builds a pool every team can cover its roles from', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const pool = generatePool(seed);
      expect(pool).toHaveLength(POOL_SIZE);
      expect(new Set(pool.map((p) => p.name)).size).toBe(POOL_SIZE);
      expect(pool.filter((p) => p.role === 'WK')).toHaveLength(4);
      pool.forEach((p) => expect(p.rating).toBeGreaterThanOrEqual(58));
    }
  });

  it('walks the bidding ladder', () => {
    expect([2, 9, 10, 28, 30, 35].map(nextBid)).toEqual([3, 10, 12, 30, 35, 40]);
    expect(isBidLevel(4, 12)).toBe(true);
    expect(isBidLevel(4, 11)).toBe(false);
    expect(isBidLevel(10, 6)).toBe(false);
  });

  it('accepts every honestly played game', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const styles = [() => 0, () => 8, () => 25, () => BUDGET];
      for (const style of styles) {
        const { results } = playGame(seed * 7919, style);
        expect(replayGame(seed * 7919, results)).toMatchObject({ ok: true });
      }
    }
  });

  it('never lets a team overspend or overfill', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { teams } = playGame(seed, () => BUDGET);
      teams.forEach((t) => {
        expect(t.purse).toBeGreaterThanOrEqual(0);
        expect(t.squad.length).toBeLessThanOrEqual(SQUAD_SIZE);
      });
    }
  });

  it('rejects games that could not have happened', () => {
    const seed = 2026;
    const pool = generatePool(seed);
    const honest = playGame(seed, () => 0).results;

    // Winning every lot at the opening bid
    expect(replayGame(seed, pool.map((p) => ({ winner: 0, price: p.base })))).toMatchObject({ ok: false });
    // Too few lots
    expect(replayGame(seed, honest.slice(1))).toMatchObject({ ok: false });
    // Taking a lot a rival won, for less than the rival paid
    const sold = honest.findIndex((r) => r.winner !== null && r.winner !== 0);
    const stolen = honest.map((r, i) => (i === sold ? { winner: 0, price: pool[i].base - 1 } : r));
    expect(replayGame(seed, stolen)).toMatchObject({ ok: false, lot: sold });
    // A price that is not on the ladder
    const offLadder = honest.map((r, i) => (i === sold ? { winner: r.winner, price: r.price + 0.5 } : r));
    expect(replayGame(seed, offLadder)).toMatchObject({ ok: false, lot: sold });
  });

  it('scores an empty squad at the floor and penalises missing roles', () => {
    expect(squadScore({ purse: BUDGET, squad: [] })).toBe(40 - 4 * 6);
    const pool = generatePool(7);
    const batters = pool.filter((p) => p.role === 'BAT').slice(0, 5);
    const average = Math.round(batters.reduce((a, p) => a + p.rating, 0) / 5);
    expect(squadScore({ purse: 0, squad: batters })).toBe(average - 3 * 6);
  });
});
