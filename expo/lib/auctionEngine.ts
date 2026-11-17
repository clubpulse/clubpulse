// Auction Room game engine: a T20 franchise auction in the style of the IPL's.
//
// KEEP IDENTICAL IN BOTH PLACES: src/lib/games/auction-engine.ts (server) and
// expo/lib/auctionEngine.ts (app). The app plays the auction with this code and the server
// checks the finished game with the same code, so any difference between the two copies makes
// honest games fail the check. src/__tests__/auction-engine.test.ts fails if they differ.
//
// Everything here is a pure function of the seed and what has happened so far. No imports.
// Franchises and players are invented. Money is in lakhs of pretend rupees (100 lakh = 1 crore)
// and exists only inside the game; it has nothing to do with Scores.
//
// It is a mini-auction: every franchise arrives with six retained players and ₹50 crore, and
// buys the other five places in its XI.

export const BUDGET = 5_000; // ₹50 crore to spend at the auction
export const SQUAD_SIZE = 11;
export const RETAINED_COUNT = 6;
export const AUCTION_SLOTS = SQUAD_SIZE - RETAINED_COUNT;
export const RIVAL_COUNT = 9;
export const TEAM_COUNT = RIVAL_COUNT + 1; // team 0 is the player
export const POOL_SIZE = 60;
export const MAX_OVERSEAS = 4;
export const EMPTY_SLOT_RATING = 40;
export const SHORTFALL_PENALTY = 3; // per required player a squad lacks
export const MIN_BASE = 30;
/** Multiplier applied to the club's Scores value for finishing 1st, 2nd, … 10th. */
export const PLACE_MULTIPLIER = [5, 3, 2, 1, 1, 0, 0, 0, 0, 0] as const;

export type Role = 'BAT' | 'WK' | 'AR' | 'PACE' | 'SPIN';
export const ROLES: readonly Role[] = ['BAT', 'WK', 'AR', 'PACE', 'SPIN'];
export const ROLE_LABEL: Record<Role, string> = {
  BAT: 'Batter',
  WK: 'Wicketkeeper',
  AR: 'All-rounder',
  PACE: 'Fast bowler',
  SPIN: 'Spinner',
};
/** What an XI must contain. The other two places can be anyone. */
export const REQUIRED: Record<Role, number> = { BAT: 3, WK: 1, AR: 2, PACE: 2, SPIN: 1 };

export type Lot = {
  id: number;
  name: string;
  role: Role;
  rating: number;
  trait: string;
  base: number;
  overseas: boolean;
  country: string;
  flag: string;
  /** The auction set the player comes up in, or 'Retained'. */
  set: string;
};
export type Team = { purse: number; squad: Lot[] };
/** winner: team index (0 = the player), or null when nobody bid. */
export type LotResult = { winner: number | null; price: number };
export type RivalStyle = 'stars' | 'value' | 'balanced';
export type Rival = { name: string; style: RivalStyle };
export type Standing = { team: number; name: string; score: number; purse: number; place: number };
/** Where the auction has got to. Round 2 is the accelerated round for players unsold in round 1. */
export type Auction = { teams: Team[]; round: 1 | 2; queue: number[]; unsold: number[]; done: boolean };

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

function pick<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}

// ── The player pool (all invented) ───────────────────────────────────────────

type NameSet = { country: string; flag: string; first: readonly string[]; last: readonly string[] };

const HOME: NameSet = {
  country: 'India',
  flag: '🇮🇳',
  first: [
    'Aarav', 'Vihaan', 'Kabir', 'Arnav', 'Dhruv', 'Reyansh', 'Advait', 'Rudra', 'Yuvan', 'Samar', 'Tejas', 'Omkar',
    'Pranav', 'Siddharth', 'Nakul', 'Harsh', 'Jai', 'Keshav', 'Laksh', 'Manav', 'Naveen', 'Parth', 'Raghav', 'Sahil',
    'Tanmay', 'Utkarsh', 'Vedant', 'Zubin', 'Anirudh', 'Bharat', 'Chirag', 'Darshan', 'Eshan', 'Faisal', 'Gautam',
    'Imran', 'Junaid', 'Karan', 'Lokesh', 'Mihir', 'Nikhil', 'Ojas', 'Pratik', 'Rishabh', 'Sarthak', 'Tarun',
  ],
  last: [
    'Deshmukh', 'Bhaskar', 'Rangan', 'Menon', 'Nambiar', 'Shetty', 'Hegde', 'Joshi', 'Trivedi', 'Bhatt', 'Chatterjee',
    'Banerjee', 'Naidu', 'Pillai', 'Kapoor', 'Malhotra', 'Sethi', 'Gokhale', 'Sawant', 'Parekh', 'Dalal', 'Mehra',
    'Saxena', 'Tandon', 'Bose', 'Dutta', 'Barua', 'Mahanta', 'Thapa', 'Rawat', 'Negi', 'Bisht', 'Solanki', 'Rathore',
    'Shekhawat', 'Chauhan', 'Tomar', 'Dhillon', 'Sandhu', 'Grewal', 'Fernandes', 'Lobo', 'Iyengar', 'Subramanian',
    'Venkatesh', 'Krishnan', 'Gowda', 'Nayak', 'Pawar', 'Shinde', 'Kadam',
  ],
};
const ANGLO_FIRST = ['Jack', 'Oliver', 'Lachlan', 'Cooper', 'Riley', 'Hamish', 'Angus', 'Callum', 'Ethan', 'Lewis', 'Reece', 'Toby', 'Archie', 'Fraser'];
const ANGLO_LAST = ['Whitlock', 'Marlowe', 'Pennant', 'Ashdown', 'Thackeray', 'Rowntree', 'Hallam', 'Quayle', 'Draycott', 'Abernathy', 'Kestrel', 'Dalby', 'Tremaine', 'Wexford', 'Brackley', 'Summerhay'];
const OVERSEAS: readonly NameSet[] = [
  { country: 'Australia', flag: '🇦🇺', first: ANGLO_FIRST, last: ANGLO_LAST },
  { country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', first: ANGLO_FIRST, last: ANGLO_LAST },
  { country: 'New Zealand', flag: '🇳🇿', first: ANGLO_FIRST, last: ANGLO_LAST },
  {
    country: 'South Africa',
    flag: '🇿🇦',
    first: ['Ruan', 'Pieter', 'Wian', 'Thabo', 'Sipho', 'Lwazi', 'Jaco'],
    last: ['van Rensburg', 'Coetzer', 'Marais', 'Nkosi', 'Dlamini', 'Steenkamp', 'Mokoena'],
  },
  {
    country: 'West Indies',
    flag: '🌴',
    first: ['Jermaine', 'Akeem', 'Rashawn', 'Tyrell', 'Dequan', 'Kemani'],
    last: ['Baptiste', 'Lafleur', 'Prescod', 'Alleyne', 'Gittens', 'Fontaine'],
  },
  {
    country: 'Sri Lanka',
    flag: '🇱🇰',
    first: ['Dinuka', 'Sahan', 'Kasun', 'Nuwan', 'Tharindu', 'Isuru'],
    last: ['Wickramaratne', 'Jayakody', 'Abeysekara', 'Gunasekara', 'Dissanayake', 'Ratnayake'],
  },
  {
    country: 'Afghanistan',
    flag: '🇦🇫',
    first: ['Farid', 'Zubair', 'Naveed', 'Samiullah', 'Hamid', 'Yama'],
    last: ['Noorzai', 'Hotak', 'Wardak', 'Sahak', 'Amiri', 'Popal'],
  },
];
const TRAITS: Record<Role, readonly string[]> = {
  BAT: ['Opens the innings', 'Finisher', 'Anchors the chase', 'Clears the ropes', 'Plays spin well', 'Powerplay hitter'],
  WK: ['Keeps to spin', 'Keeper who opens', 'Safe hands', 'Finisher with the gloves'],
  AR: ['Bats five, bowls four', 'Seam-bowling all-rounder', 'Spin-bowling all-rounder', 'Gun fielder'],
  PACE: ['Death-overs specialist', 'Swings the new ball', 'Hits the deck hard', 'Left-arm quick', 'Yorker machine'],
  SPIN: ['Left-arm spin', 'Leg-spinner', 'Mystery spinner', 'Miserly in the middle', 'Off-spinner'],
};
const RIVAL_NAMES = [
  'Indore Ironhawks', 'Nagpur Nighthawks', 'Goa Gladiators', 'Vizag Vipers', 'Surat Stallions', 'Bhopal Blazers',
  'Mysuru Monarchs', 'Ranchi Raiders', 'Madurai Mavericks', 'Kanpur Comets', 'Shimla Snow Leopards', 'Kochi Kingfishers',
  'Guwahati Rhinos', 'Raipur Rangers',
];
const ROLE_COUNT: Record<Role, number> = { BAT: 16, WK: 8, AR: 12, PACE: 14, SPIN: 10 };
const ROLE_SET: Record<Role, string> = {
  BAT: 'Batters',
  AR: 'All-rounders',
  WK: 'Wicketkeepers',
  PACE: 'Fast bowlers',
  SPIN: 'Spinners',
};
const SET_ORDER: readonly Role[] = ['BAT', 'AR', 'WK', 'PACE', 'SPIN'];
export const MARQUEE_COUNT = 6;
export const UNCAPPED_BELOW = 68;

/** Base price in lakhs for a player of this rating. */
export function basePrice(rating: number): number {
  if (rating >= 90) return 200;
  if (rating >= 84) return 150;
  if (rating >= 76) return 100;
  if (rating >= UNCAPPED_BELOW) return 50;
  return MIN_BASE;
}

type World = { pool: Lot[]; retained: Lot[][] };

function buildWorld(seed: number): World {
  const rand = rng(mix(seed, 1));
  const used = new Set<string>();
  const make = (role: Role, rating: number, overseas: boolean) => {
    const names = overseas ? pick(OVERSEAS, rand) : HOME;
    let name = '';
    do {
      name = `${pick(names.first, rand)} ${pick(names.last, rand)}`;
    } while (used.has(name));
    used.add(name);
    return {
      name,
      role,
      rating,
      trait: pick(TRAITS[role], rand),
      base: basePrice(rating),
      overseas,
      country: names.country,
      flag: names.flag,
    };
  };

  // The auction pool
  const ratings: number[] = [];
  for (let i = 0; i < MARQUEE_COUNT; i++) ratings.push(90 + Math.floor(rand() * 7));
  for (let i = 0; i < 14; i++) ratings.push(80 + Math.floor(rand() * 10));
  for (let i = 0; i < 24; i++) ratings.push(UNCAPPED_BELOW + Math.floor(rand() * 12));
  for (let i = 0; i < 16; i++) ratings.push(56 + Math.floor(rand() * 12));
  const mixedRatings = shuffled(ratings, rand);
  const roles = shuffled(
    ROLES.flatMap((r) => Array.from({ length: ROLE_COUNT[r] }, () => r)),
    rand,
  );
  // About four in ten capped players are overseas; uncapped players are all home-grown
  const players = roles.map((role, i) => make(role, mixedRatings[i], mixedRatings[i] >= UNCAPPED_BELOW && rand() < 0.42));

  const marquee = [...players].sort((a, b) => b.rating - a.rating).slice(0, MARQUEE_COUNT);
  const rest = players.filter((p) => !marquee.includes(p));
  const ordered = [
    ...shuffled(marquee, rand).map((p) => ({ ...p, set: 'Marquee set' })),
    ...SET_ORDER.flatMap((role) =>
      rest.filter((p) => p.role === role && p.rating >= UNCAPPED_BELOW).map((p) => ({ ...p, set: ROLE_SET[role] })),
    ),
    ...SET_ORDER.flatMap((role) =>
      rest.filter((p) => p.role === role && p.rating < UNCAPPED_BELOW).map((p) => ({ ...p, set: 'Uncapped players' })),
    ),
  ];
  const pool = ordered.map((p, id) => ({ id, ...p }));

  // Six retained players per franchise: the same spread of ratings for everyone, different roles,
  // so each franchise comes to the auction needing different things
  const retained: Lot[][] = [];
  for (let team = 0; team < TEAM_COUNT; team++) {
    const teamRoles = shuffled<Role>(['BAT', 'BAT', 'BAT', 'WK', 'AR', 'AR', 'PACE', 'PACE', 'SPIN'], rand).slice(0, RETAINED_COUNT);
    const teamRatings = shuffled(
      [84 + Math.floor(rand() * 5), 78 + Math.floor(rand() * 5), 78 + Math.floor(rand() * 5), 70 + Math.floor(rand() * 6), 70 + Math.floor(rand() * 6), 70 + Math.floor(rand() * 6)],
      rand,
    );
    let overseas = 0;
    retained.push(
      teamRoles.map((role, i) => {
        const isOverseas = overseas < 2 && rand() < 0.3;
        if (isOverseas) overseas += 1;
        return { id: 1000 + team * RETAINED_COUNT + i, ...make(role, teamRatings[i], isOverseas), base: 0, set: 'Retained' };
      }),
    );
  }
  return { pool, retained };
}

/** The players up for auction, in order: marquee set, then a set per role, then uncapped players. */
export function generatePool(seed: number): Lot[] {
  return buildWorld(seed).pool;
}

/** Each franchise's six retained players. Index 0 is the player's franchise. */
export function generateRetained(seed: number): Lot[][] {
  return buildWorld(seed).retained;
}

export function generateRivals(seed: number): Rival[] {
  const rand = rng(mix(seed, 2));
  const names = shuffled(RIVAL_NAMES, rand).slice(0, RIVAL_COUNT);
  const styles: RivalStyle[] = ['stars', 'value', 'balanced'];
  const offset = Math.floor(rand() * 3);
  return names.map((name, i) => ({ name, style: styles[(i + offset) % 3] }));
}

export function newTeams(retained: readonly Lot[][]): Team[] {
  return retained.map((squad) => ({ purse: BUDGET, squad: [...squad] }));
}

// ── The bidding ladder ───────────────────────────────────────────────────────

/** The next bid after this one, in lakhs. Steps get bigger as the price climbs. */
export function nextBid(price: number): number {
  if (price < 100) return price + 10;
  if (price < 200) return price + 25;
  if (price < 500) return price + 50;
  if (price < 1000) return price + 100;
  return price + 200;
}

/** True if price is a bid that can be reached from this base price. */
export function isBidLevel(base: number, price: number): boolean {
  if (!Number.isInteger(price)) return false;
  let p = base;
  while (p < price) p = nextBid(p);
  return p === price;
}

/** The highest bid level at or below limit, or 0 if even the base price is too much. */
function floorToLevel(base: number, limit: number): number {
  if (limit < base) return 0;
  let p = base;
  while (nextBid(p) <= limit) p = nextBid(p);
  return p;
}

/** "₹12.5 cr" or "₹50 L". */
export function formatMoney(lakhs: number): string {
  if (lakhs < 100) return `₹${lakhs} L`;
  return `₹${parseFloat((lakhs / 100).toFixed(2))} cr`;
}

// ── Squads ───────────────────────────────────────────────────────────────────

export function overseasCount(team: Team): number {
  return team.squad.filter((p) => p.overseas).length;
}

/** How many more of each role the squad needs to meet REQUIRED. */
export function shortfall(team: Team): Record<Role, number> {
  const out = { ...REQUIRED };
  team.squad.forEach((p) => {
    if (out[p.role] > 0) out[p.role] -= 1;
  });
  return out;
}

export function totalShortfall(team: Team): number {
  const s = shortfall(team);
  return ROLES.reduce((a, r) => a + s[r], 0);
}

/** Why this team cannot buy this player at this price, or null if it can. */
export function cannotBuy(team: Team, lot: Lot, price: number): string | null {
  if (team.squad.length >= SQUAD_SIZE) return 'squad already full';
  if (lot.overseas && overseasCount(team) >= MAX_OVERSEAS) return 'overseas limit reached';
  if (team.purse < price) return 'not enough purse';
  return null;
}

// ── Rival franchises ─────────────────────────────────────────────────────────

/** What a player of this rating is worth to an average franchise, in lakhs. */
function worth(rating: number): number {
  const x = Math.max(0, Math.min(1, (rating - 55) / 40));
  return 30 + 1900 * Math.pow(x, 1.5);
}

/**
 * The most each rival will pay for `lot`, given the teams as they stand and the players still to
 * come in this round. One number per rival (teams 1..RIVAL_COUNT); 0 means that rival will not bid.
 */
export function rivalLimits(
  seed: number,
  rivals: readonly Rival[],
  lot: Lot,
  teams: readonly Team[],
  upcoming: readonly Lot[],
  round: 1 | 2,
): number[] {
  const out: number[] = [];
  for (let r = 0; r < RIVAL_COUNT; r++) {
    const team = teams[r + 1];
    const slots = SQUAD_SIZE - team.squad.length;
    if (slots <= 0 || (lot.overseas && overseasCount(team) >= MAX_OVERSEAS)) {
      out.push(0);
      continue;
    }
    const short = shortfall(team);
    const needed = totalShortfall(team);
    const needsRole = short[lot.role] > 0;
    // Keep the remaining places for roles the squad still lacks
    if (!needsRole && slots <= needed) {
      out.push(0);
      continue;
    }

    // A franchise with money to spend waits for better players while enough of them are still to come
    const richness = team.purse / slots / (BUDGET / AUCTION_SLOTS);
    if (round === 1) {
      const bar = 64 + 9 * Math.max(0, Math.min(1.5, richness - 0.7));
      const betterToCome = upcoming.filter((p) => p.role === lot.role && p.rating >= bar).length;
      if (lot.rating < bar && betterToCome >= (needsRole ? short[lot.role] : 1) + 3) {
        out.push(0);
        continue;
      }
    }

    const style = rivals[r].style;
    // Rivals bid a little under a player's worth, which leaves room for a sharp bidder
    let m = 0.8;
    if (style === 'stars') m *= lot.rating >= 86 ? 1.25 : 0.85;
    else if (style === 'value') m *= lot.rating >= 72 && lot.rating <= 85 ? 1.12 : 0.9;

    m *= needsRole ? 1.15 : 0.92;
    // Few chances left at a role the squad lacks
    if (needsRole && upcoming.filter((p) => p.role === lot.role).length <= 4) m *= 1.3;
    // Spend in line with what is left for each remaining place
    m *= Math.sqrt(Math.max(0.5, Math.min(2.2, richness)));
    // Each rival reads each player a little differently
    m *= 0.88 + 0.24 * rng(mix(mix(seed, round * 1000 + lot.id), r))();

    let limit = Math.round(worth(lot.rating) * m);
    // Money that would otherwise go unspent gets used once the players are running out
    if (round === 2 || upcoming.length < slots * 4) limit = Math.max(limit, Math.round((team.purse / slots) * 0.5));
    // No single player takes more than 60% of a full purse
    limit = Math.min(limit, BUDGET * 0.6);
    // Leave at least the lowest base price for every other empty place
    limit = Math.min(limit, team.purse - MIN_BASE * (slots - 1));
    out.push(floorToLevel(lot.base, limit));
  }
  return out;
}

/** The order in which rivals get to bid on a lot when more than one wants to (rival numbers 0..8). */
export function rivalOrder(seed: number, lot: Lot, round: 1 | 2): number[] {
  return shuffled(
    Array.from({ length: RIVAL_COUNT }, (_, i) => i),
    rng(mix(seed, 50_000 + round * 1000 + lot.id)),
  );
}

// ── Running the auction ──────────────────────────────────────────────────────

export function newAuction(pool: readonly Lot[], retained: readonly Lot[][]): Auction {
  return { teams: newTeams(retained), round: 1, queue: pool.map((p) => p.id), unsold: [], done: pool.length === 0 };
}

/** The player on the block. Only call while the auction is not done. */
export function currentLot(pool: readonly Lot[], a: Auction): Lot {
  return pool[a.queue[0]];
}

/** Players still to come in this round, after the one on the block. */
export function upcomingLots(pool: readonly Lot[], a: Auction): Lot[] {
  return a.queue.slice(1).map((id) => pool[id]);
}

export function currentLimits(seed: number, rivals: readonly Rival[], pool: readonly Lot[], a: Auction): number[] {
  return rivalLimits(seed, rivals, currentLot(pool, a), a.teams, upcomingLots(pool, a), a.round);
}

/** Why this result is not possible, or null if it is. */
export function checkResult(lot: Lot, teams: readonly Team[], limits: readonly number[], result: LotResult): string | null {
  const { winner, price } = result;
  if (winner === null) {
    if (price !== 0) return 'unsold lot with a price';
    return limits.some((l) => l >= lot.base) ? 'a rival would have bid' : null;
  }
  if (!Number.isInteger(winner) || winner < 0 || winner >= TEAM_COUNT) return 'unknown winner';
  if (!isBidLevel(lot.base, price)) return 'not a valid bid';
  const blocked = cannotBuy(teams[winner], lot, price);
  if (blocked) return blocked;

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

/** Records the result for the player on the block and moves on. Unsold players return once, in round 2. */
export function advance(pool: readonly Lot[], a: Auction, result: LotResult): Auction {
  const lot = currentLot(pool, a);
  const teams = a.teams.map((t, i) =>
    i === result.winner ? { purse: t.purse - result.price, squad: [...t.squad, lot] } : { purse: t.purse, squad: [...t.squad] },
  );
  const queue = a.queue.slice(1);
  const unsold = result.winner === null && a.round === 1 ? [...a.unsold, lot.id] : a.unsold;
  if (queue.length > 0) return { teams, round: a.round, queue, unsold, done: false };
  if (a.round === 1 && unsold.length > 0) return { teams, round: 2, queue: unsold, unsold: [], done: false };
  return { teams, round: a.round, queue: [], unsold: [], done: true };
}

/** Squad score out of 100: average rating over eleven places, less a penalty for each required player missing. */
export function squadScore(team: Team): number {
  const squad = team.squad.slice(0, SQUAD_SIZE);
  const total = squad.reduce((a, p) => a + p.rating, 0) + (SQUAD_SIZE - squad.length) * EMPTY_SLOT_RATING;
  const exact = total / SQUAD_SIZE - SHORTFALL_PENALTY * totalShortfall({ purse: 0, squad });
  return Math.max(0, Math.round(exact * 10) / 10);
}

/** Final table, best first. Ties go to the team with more purse left, then to the player. */
export function standings(rivals: readonly Rival[], teams: readonly Team[]): Standing[] {
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
  const rivals = generateRivals(seed);
  let a = newAuction(pool, generateRetained(seed));
  let used = 0;
  while (!a.done) {
    if (used >= results.length) return { ok: false, error: 'too few results', lot: used };
    const lot = currentLot(pool, a);
    const problem = checkResult(lot, a.teams, currentLimits(seed, rivals, pool, a), results[used]);
    if (problem) return { ok: false, error: problem, lot: used };
    a = advance(pool, a, results[used]);
    used += 1;
  }
  if (used !== results.length) return { ok: false, error: 'too many results', lot: used };
  const table = standings(rivals, a.teams);
  const mine = table.find((row) => row.team === 0)!;
  return { ok: true, teams: a.teams, table, place: mine.place, score: mine.score };
}
