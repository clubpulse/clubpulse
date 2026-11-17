// Auction Room game engine.
//
// KEEP IDENTICAL IN BOTH PLACES: src/lib/games/auction-engine.ts (server) and
// expo/lib/auctionEngine.ts (app). The app plays the auction with this code and the server
// checks the finished game with the same code, so any difference between the two copies makes
// honest games fail the check. src/__tests__/auction-engine.test.ts fails if they differ.
//
// Everything here is a pure function of the seed and what has happened so far. No imports.

export const BUDGET = 100; // pretend money, shown as "100k". Nothing to do with Scores.
export const SQUAD_SIZE = 5;
export const RIVAL_COUNT = 3;
export const TEAM_COUNT = RIVAL_COUNT + 1; // team 0 is the player
export const POOL_SIZE = 20;
export const EMPTY_SLOT_RATING = 40;
export const MISSING_ROLE_PENALTY = 6;
/** Multiplier applied to the club's Scores value for finishing 1st, 2nd, 3rd, 4th. */
export const PLACE_MULTIPLIER = [3, 2, 1, 0] as const;

export type Role = 'BAT' | 'BOWL' | 'AR' | 'WK';
export const ROLES: readonly Role[] = ['BAT', 'BOWL', 'AR', 'WK'];
export const ROLE_LABEL: Record<Role, string> = {
  BAT: 'Batter',
  BOWL: 'Bowler',
  AR: 'All-rounder',
  WK: 'Keeper',
};

export type Lot = { id: number; name: string; role: Role; rating: number; trait: string; base: number };
export type Team = { purse: number; squad: Lot[] };
/** winner: team index (0 = the player), or null when nobody bid. */
export type LotResult = { winner: number | null; price: number };
export type RivalStyle = 'stars' | 'value' | 'balanced';
export type Rival = { name: string; style: RivalStyle };
export type Standing = { team: number; name: string; score: number; purse: number; place: number };

// ── Seeded random numbers ────────────────────────────────────────────────────

function mix(a: number, b: number): number {
  let h = (a ^ Math.imul(b + 0x9e3779b9, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── The player pool (all invented) ───────────────────────────────────────────

const FIRST_NAMES = [
  'Arjun', 'Tom', 'Imran', 'Callum', 'Dev', 'Marcus', 'Ravi', 'Jack', 'Sam', 'Kofi', 'Nikhil', 'Ollie',
  'Farhan', 'Lewis', 'Anil', 'Reece', 'Tariq', 'Ben', 'Sanjay', 'Kyle', 'Priya', 'Hannah', 'Aisha', 'Ellie',
  'Meera', 'Grace', 'Zara', 'Lucy', 'Kavya', 'Maya', 'Sophie', 'Nadia', 'Chloe', 'Anika', 'Freya', 'Tess',
];
const SURNAMES = [
  'Whitlock', 'Marlowe', 'Pennant', 'Ashdown', 'Varma', 'Okoro', 'Thackeray', 'Lindqvist', 'Castellan', 'Rowntree',
  'Bhaskar', 'Hallam', 'Ferreira', 'Quayle', 'Nwosu', 'Draycott', 'Sorensen', 'Mistry-Hale', 'Abernathy', 'Kestrel',
  'Dalby', 'Iyengar-Moss', 'Tremaine', 'Osei', 'Wexford', 'Rangan', 'Brackley', 'Villiers', 'Summerhay', 'Achebe',
];
const TRAITS: Record<Role, readonly string[]> = {
  BAT: ['Opens the innings', 'Finisher', 'Anchors the chase', 'Clears the ropes', 'Plays spin well', 'Quick between the wickets'],
  BOWL: ['Death-overs specialist', 'Swings the new ball', 'Left-arm spin', 'Hits the deck hard', 'Leg-spinner', 'Miserly in the middle'],
  AR: ['Bats five, bowls four', 'Seam-bowling all-rounder', 'Spin-bowling all-rounder', 'Gun fielder'],
  WK: ['Keeps to spin', 'Keeper who opens', 'Safe hands', 'Chirps all day'],
};
const RIVAL_NAMES = [
  'Riverside Royals', 'Northgate Knights', 'Harbour Hawks', 'Millfield Mavericks', 'Castle Hill Chargers',
  'Greenway Giants', 'Stonebridge Strikers', 'Lakeside Lions',
];
const ROLE_SPREAD: readonly Role[] = [
  'BAT', 'BAT', 'BAT', 'BAT', 'BAT', 'BAT',
  'BOWL', 'BOWL', 'BOWL', 'BOWL', 'BOWL', 'BOWL',
  'AR', 'AR', 'AR', 'AR',
  'WK', 'WK', 'WK', 'WK',
];

/** Lowest opening bid for a player of this rating. */
export function basePrice(rating: number): number {
  if (rating >= 88) return 10;
  if (rating >= 80) return 6;
  if (rating >= 70) return 4;
  return 2;
}

/** The 20 players in the order they come up for auction. */
export function generatePool(seed: number): Lot[] {
  const rand = rng(mix(seed, 1));
  const firsts = shuffled(FIRST_NAMES, rand);
  const lasts = shuffled(SURNAMES, rand);
  // 3 stars, 7 good players, 10 squad players
  const ratings: number[] = [];
  for (let i = 0; i < 3; i++) ratings.push(88 + Math.floor(rand() * 8));
  for (let i = 0; i < 7; i++) ratings.push(76 + Math.floor(rand() * 12));
  for (let i = 0; i < 10; i++) ratings.push(58 + Math.floor(rand() * 18));
  const mixedRatings = shuffled(ratings, rand);
  const roles = shuffled(ROLE_SPREAD, rand);
  return roles.map((role, id) => {
    const rating = mixedRatings[id];
    const traits = TRAITS[role];
    return {
      id,
      name: `${firsts[id]} ${lasts[id]}`,
      role,
      rating,
      trait: traits[Math.floor(rand() * traits.length)],
      base: basePrice(rating),
    };
  });
}

export function generateRivals(seed: number): Rival[] {
  const rand = rng(mix(seed, 2));
  const names = shuffled(RIVAL_NAMES, rand).slice(0, RIVAL_COUNT);
  const styles = shuffled<RivalStyle>(['stars', 'value', 'balanced'], rand);
  return names.map((name, i) => ({ name, style: styles[i] }));
}

export function newTeams(): Team[] {
  return Array.from({ length: TEAM_COUNT }, () => ({ purse: BUDGET, squad: [] }));
}

// ── The bidding ladder ───────────────────────────────────────────────────────

/** The next bid after this one: +1 below 10k, +2 below 30k, +5 from there. */
export function nextBid(price: number): number {
  if (price < 10) return price + 1;
  if (price < 30) return price + 2;
  return price + 5;
}

/** True if price is a bid that can be reached from this opening bid. */
export function isBidLevel(base: number, price: number): boolean {
  if (!Number.isInteger(price)) return false;
  let p = base;
  while (p < price) p = nextBid(p);
  return p === price;
}

/** The highest bid level at or below limit, or 0 if even the opening bid is too much. */
function floorToLevel(base: number, limit: number): number {
  if (limit < base) return 0;
  let p = base;
  while (nextBid(p) <= limit) p = nextBid(p);
  return p;
}

// ── Rival franchises ─────────────────────────────────────────────────────────

export function missingRoles(team: Team): Role[] {
  return ROLES.filter((r) => !team.squad.some((p) => p.role === r));
}

/** What a player of this rating is worth to an average franchise. */
function worth(rating: number): number {
  const x = Math.max(0, Math.min(1, (rating - 55) / 40));
  return 3 + 40 * Math.pow(x, 1.7);
}

/**
 * The most each rival will pay for lot `index`, given the teams as they stand before it.
 * Returns one number per rival (teams 1..RIVAL_COUNT); 0 means that rival will not bid.
 */
export function rivalLimits(seed: number, pool: readonly Lot[], teams: readonly Team[], index: number): number[] {
  const lot = pool[index];
  const rivals = generateRivals(seed);
  const later = pool.slice(index + 1);
  const out: number[] = [];

  for (let r = 0; r < RIVAL_COUNT; r++) {
    const team = teams[r + 1];
    const slots = SQUAD_SIZE - team.squad.length;
    if (slots <= 0) {
      out.push(0);
      continue;
    }
    const missing = missingRoles(team);
    const needsRole = missing.includes(lot.role);
    // Keep the remaining slots for roles the squad still lacks
    if (!needsRole && slots <= missing.length) {
      out.push(0);
      continue;
    }

    const style = rivals[r].style;
    let m = 1;
    if (style === 'stars') m = lot.rating >= 85 ? 1.25 : 0.85;
    else if (style === 'value') m = lot.rating >= 70 && lot.rating <= 84 ? 1.1 : 0.9;

    m *= needsRole ? 1.15 : 0.9;
    // Last chance at a role the squad lacks
    if (needsRole && later.filter((p) => p.role === lot.role).length <= 1) m *= 1.3;
    // Running out of players to buy
    if (later.length < slots * 2) m *= 1.25;
    // Each rival reads each player a little differently
    m *= 0.8 + 0.4 * rng(mix(mix(seed, 100 + index), r))();

    let limit = Math.round(worth(lot.rating) * m);
    // Money that will otherwise go unspent gets used late on
    if (later.length <= 6) limit = Math.max(limit, Math.round((team.purse / slots) * 0.8));
    // Leave at least the lowest opening bid for every other empty slot
    limit = Math.min(limit, team.purse - 2 * (slots - 1));
    out.push(floorToLevel(lot.base, limit));
  }
  return out;
}

/** The order in which rivals get to bid on this lot when more than one wants to (rival numbers 0..2). */
export function rivalOrder(seed: number, index: number): number[] {
  return shuffled([0, 1, 2].slice(0, RIVAL_COUNT), rng(mix(seed, 500 + index)));
}

// ── Results ──────────────────────────────────────────────────────────────────

/** Why this result is not possible, or null if it is. */
export function checkResult(lot: Lot, teams: readonly Team[], limits: readonly number[], result: LotResult): string | null {
  const { winner, price } = result;
  const anyRivalWants = limits.some((l) => l >= lot.base);

  if (winner === null) {
    if (price !== 0) return 'unsold lot with a price';
    return anyRivalWants ? 'a rival would have bid' : null;
  }
  if (!Number.isInteger(winner) || winner < 0 || winner >= TEAM_COUNT) return 'unknown winner';
  if (!isBidLevel(lot.base, price)) return 'not a valid bid';

  const team = teams[winner];
  if (team.squad.length >= SQUAD_SIZE) return 'squad already full';
  if (team.purse < price) return 'not enough budget';

  const raise = nextBid(price);
  for (let r = 0; r < RIVAL_COUNT; r++) {
    if (r + 1 === winner) {
      if (limits[r] < price) return 'rival paid over its limit';
    } else if (limits[r] >= raise) {
      return 'a rival would have bid higher';
    }
  }
  return null;
}

export function applyResult(teams: readonly Team[], lot: Lot, result: LotResult): Team[] {
  if (result.winner === null) return teams.map((t) => ({ purse: t.purse, squad: [...t.squad] }));
  return teams.map((t, i) =>
    i === result.winner ? { purse: t.purse - result.price, squad: [...t.squad, lot] } : { purse: t.purse, squad: [...t.squad] },
  );
}

/** Squad score out of 100: average rating over five slots, less a penalty for each role not covered. */
export function squadScore(team: Team): number {
  const squad = team.squad.slice(0, SQUAD_SIZE);
  const total = squad.reduce((a, p) => a + p.rating, 0) + (SQUAD_SIZE - squad.length) * EMPTY_SLOT_RATING;
  return Math.max(0, Math.round(total / SQUAD_SIZE) - MISSING_ROLE_PENALTY * missingRoles({ purse: 0, squad }).length);
}

/** Final table, best first. Ties go to the team with more budget left, then to the player. */
export function standings(seed: number, teams: readonly Team[]): Standing[] {
  const rivals = generateRivals(seed);
  const rows = teams.map((t, team) => ({
    team,
    name: team === 0 ? 'You' : rivals[team - 1].name,
    score: squadScore(t),
    purse: t.purse,
    place: 0,
  }));
  rows.sort((a, b) => b.score - a.score || b.purse - a.purse || a.team - b.team);
  rows.forEach((row, i) => {
    row.place = i + 1;
  });
  return rows;
}

export type Replay =
  | { ok: true; teams: Team[]; table: Standing[]; place: number; score: number }
  | { ok: false; error: string; lot: number };

/** Plays a finished game back from its seed and checks every lot could have gone the way it says. */
export function replayGame(seed: number, results: readonly LotResult[]): Replay {
  const pool = generatePool(seed);
  if (results.length !== pool.length) return { ok: false, error: 'wrong number of lots', lot: -1 };
  let teams = newTeams();
  for (let i = 0; i < pool.length; i++) {
    const problem = checkResult(pool[i], teams, rivalLimits(seed, pool, teams, i), results[i]);
    if (problem) return { ok: false, error: problem, lot: i };
    teams = applyResult(teams, pool[i], results[i]);
  }
  const table = standings(seed, teams);
  const mine = table.find((row) => row.team === 0)!;
  return { ok: true, teams, table, place: mine.place, score: mine.score };
}
