// Auction Room game engine: a T20 franchise auction in the style of the IPL's.
//
// KEEP IDENTICAL IN BOTH PLACES: src/lib/games/auction-engine.ts (server) and
// expo/lib/auctionEngine.ts (app). The app plays the auction with this code and the server
// checks the finished game with the same code, so any difference between the two copies makes
// honest games fail the check. src/__tests__/auction-engine.test.ts fails if they differ.
//
// Everything here is a pure function of the seed and what has happened so far. No imports.
//
// Players are real cricketers, by name, country and role only: no photos, no team badges, and
// nothing that suggests they endorse the game. The points next to each are ClubPulse's own
// estimate of T20 value, not an official figure. Franchises are invented. Money is in lakhs of
// pretend rupees (100 lakh = 1 crore) and exists only inside the game; it is nothing to do with Scores.

export const BUDGET = 10_000; // ₹100 crore
export const SQUAD_SIZE = 15;
export const RIVAL_COUNT = 5;
export const TEAM_COUNT = RIVAL_COUNT + 1; // team 0 is the player
export const POOL_SIZE = 126;
export const MAX_OVERSEAS = 6;
/** Team points for each squad objective met. */
export const OBJECTIVE_POINTS = 30;
export const MIN_BASE = 30;
/** Multiplier applied to the club's Scores value for finishing 1st, 2nd, … 6th. Top three are paid. */
export const PLACE_MULTIPLIER = [5, 3, 2, 0, 0, 0] as const;

export type Role = 'BAT' | 'WK' | 'AR' | 'PACE' | 'SPIN';
export const ROLES: readonly Role[] = ['BAT', 'WK', 'AR', 'PACE', 'SPIN'];
export const ROLE_LABEL: Record<Role, string> = {
  BAT: 'Batter',
  WK: 'Wicketkeeper',
  AR: 'All-rounder',
  PACE: 'Fast bowler',
  SPIN: 'Spinner',
};
/** The squad objectives by role. The fifteenth place can be anyone. */
export const REQUIRED: Record<Role, number> = { BAT: 4, WK: 2, AR: 3, PACE: 3, SPIN: 2 };

export type Lot = {
  id: number;
  name: string;
  role: Role;
  /** Points the player is worth to a squad, 60 to 99. */
  rating: number;
  base: number;
  overseas: boolean;
  country: string;
  flag: string;
  /** The auction set the player comes up in. */
  set: string;
};
export type Team = { purse: number; squad: Lot[] };
/** winner: team index (0 = the player), or null when nobody bid. */
export type LotResult = { winner: number | null; price: number };
export type RivalStyle = 'stars' | 'value' | 'balanced';
export type Rival = { name: string; style: RivalStyle };
export type Standing = { team: number; name: string; score: number; purse: number; place: number };
export type Objective = { label: string; met: boolean };
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

// ── The player pool ──────────────────────────────────────────────────────────

const COUNTRY: Record<string, { name: string; flag: string }> = {
  IND: { name: 'India', flag: '🇮🇳' },
  AUS: { name: 'Australia', flag: '🇦🇺' },
  ENG: { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  NZ: { name: 'New Zealand', flag: '🇳🇿' },
  SA: { name: 'South Africa', flag: '🇿🇦' },
  WI: { name: 'West Indies', flag: '🌴' },
  SL: { name: 'Sri Lanka', flag: '🇱🇰' },
  AFG: { name: 'Afghanistan', flag: '🇦🇫' },
};

// name|country|points. Points are ClubPulse's own estimate of T20 value: edit them here (in both
// copies of this file) as form changes. Anyone not from India counts as an overseas player.
const PLAYERS: Record<Role, readonly string[]> = {
  BAT: [
    'Virat Kohli|IND|95', 'Suryakumar Yadav|IND|93', 'Abhishek Sharma|IND|93', 'Yashasvi Jaiswal|IND|92',
    'Shubman Gill|IND|91', 'Shreyas Iyer|IND|90', 'Tilak Varma|IND|89', 'Rohit Sharma|IND|88',
    'Sai Sudharsan|IND|88', 'Ruturaj Gaikwad|IND|86', 'Rinku Singh|IND|84', 'Rajat Patidar|IND|84',
    'Priyansh Arya|IND|82', 'Shashank Singh|IND|80', 'Devdutt Padikkal|IND|78', 'Ayush Mhatre|IND|78',
    'Nehal Wadhera|IND|76', 'Angkrish Raghuvanshi|IND|76', 'Ayush Badoni|IND|74', 'Nitish Rana|IND|74',
    'Ajinkya Rahane|IND|72', 'Travis Head|AUS|92', 'Harry Brook|ENG|86', 'Tim David|AUS|85',
    'Dewald Brevis|SA|84', 'David Miller|SA|82', 'Aiden Markram|SA|82', 'Shimron Hetmyer|WI|80',
    'Finn Allen|NZ|80', 'Pathum Nissanka|SL|80', 'Jake Fraser-McGurk|AUS|74', 'Rovman Powell|WI|74',
  ],
  WK: [
    'KL Rahul|IND|89', 'Rishabh Pant|IND|88', 'Sanju Samson|IND|87', 'Ishan Kishan|IND|82',
    'Prabhsimran Singh|IND|81', 'Jitesh Sharma|IND|80', 'Dhruv Jurel|IND|79', 'MS Dhoni|IND|75',
    'Abishek Porel|IND|74', 'Jos Buttler|ENG|93', 'Heinrich Klaasen|SA|92', 'Nicholas Pooran|WI|92',
    'Phil Salt|ENG|90', 'Quinton de Kock|SA|82', 'Tristan Stubbs|SA|82', 'Josh Inglis|AUS|82',
    'Ryan Rickelton|SA|81', 'Rahmanullah Gurbaz|AFG|78',
  ],
  AR: [
    'Hardik Pandya|IND|93', 'Axar Patel|IND|89', 'Ravindra Jadeja|IND|86', 'Nitish Kumar Reddy|IND|82',
    'Shivam Dube|IND|82', 'Riyan Parag|IND|82', 'Washington Sundar|IND|80', 'Krunal Pandya|IND|80',
    'Venkatesh Iyer|IND|76', 'Harpreet Brar|IND|72', 'Ramandeep Singh|IND|70', 'Shahbaz Ahmed|IND|68',
    'Sunil Narine|WI|91', 'Mitchell Marsh|AUS|88', 'Cameron Green|AUS|86', 'Marco Jansen|SA|86',
    'Marcus Stoinis|AUS|82', 'Will Jacks|ENG|82', 'Andre Russell|WI|82', 'Sam Curran|ENG|80',
    'Jacob Bethell|ENG|80', 'Rachin Ravindra|NZ|80', 'Mitchell Santner|NZ|80', 'Azmatullah Omarzai|AFG|80',
    'Glenn Maxwell|AUS|78', 'Liam Livingstone|ENG|78',
  ],
  PACE: [
    'Jasprit Bumrah|IND|99', 'Arshdeep Singh|IND|89', 'Mohammed Siraj|IND|86', 'Prasidh Krishna|IND|84',
    'Mohammed Shami|IND|80', 'Harshal Patel|IND|80', 'Bhuvneshwar Kumar|IND|80', 'Harshit Rana|IND|78',
    'Khaleel Ahmed|IND|76', 'Deepak Chahar|IND|74', 'Avesh Khan|IND|74', 'T Natarajan|IND|74',
    'Mayank Yadav|IND|74', 'Yash Dayal|IND|74', 'Vaibhav Arora|IND|74', 'Mukesh Kumar|IND|72',
    'Sandeep Sharma|IND|72', 'Tushar Deshpande|IND|70', 'Mitchell Starc|AUS|90', 'Josh Hazlewood|AUS|90',
    'Pat Cummins|AUS|88', 'Kagiso Rabada|SA|88', 'Trent Boult|NZ|87', 'Jofra Archer|ENG|86',
    'Matheesha Pathirana|SL|84', 'Lockie Ferguson|NZ|80', 'Matt Henry|NZ|80', 'Anrich Nortje|SA|78',
    'Nathan Ellis|AUS|78', 'Fazalhaq Farooqi|AFG|78',
  ],
  SPIN: [
    'Varun Chakaravarthy|IND|91', 'Kuldeep Yadav|IND|90', 'Yuzvendra Chahal|IND|84', 'Ravi Bishnoi|IND|82',
    'Sai Kishore|IND|78', 'Digvesh Rathi|IND|74', 'Suyash Sharma|IND|72', 'Vipraj Nigam|IND|70',
    'Rahul Chahar|IND|68', 'Harsh Dubey|IND|68', 'Mayank Markande|IND|66', 'Rashid Khan|AFG|92',
    'Noor Ahmad|AFG|86', 'Adam Zampa|AUS|82', 'Wanindu Hasaranga|SL|82', 'Maheesh Theekshana|SL|80',
    'Adil Rashid|ENG|80', 'Mujeeb Ur Rahman|AFG|76', 'Keshav Maharaj|SA|76', 'Akeal Hosein|WI|76',
  ],
};
const ROLE_SET: Record<Role, string> = {
  BAT: 'Batters',
  AR: 'All-rounders',
  WK: 'Wicketkeepers',
  PACE: 'Fast bowlers',
  SPIN: 'Spinners',
};
const SET_ORDER: readonly Role[] = ['BAT', 'AR', 'WK', 'PACE', 'SPIN'];
export const MARQUEE_COUNT = 10;
/** Players below this come up last, in the value set. */
export const VALUE_SET_BELOW = 76;
const RIVAL_NAMES = [
  'Indore Ironhawks', 'Nagpur Nighthawks', 'Goa Gladiators', 'Vizag Vipers', 'Surat Stallions', 'Bhopal Blazers',
  'Mysuru Monarchs', 'Ranchi Raiders', 'Madurai Mavericks', 'Kanpur Comets', 'Shimla Snow Leopards', 'Kochi Kingfishers',
  'Guwahati Rhinos', 'Raipur Rangers',
];

/** Base price in lakhs for a player worth this many points. */
export function basePrice(rating: number): number {
  if (rating >= 90) return 200;
  if (rating >= 84) return 150;
  if (rating >= VALUE_SET_BELOW) return 100;
  if (rating >= 70) return 50;
  return MIN_BASE;
}

/** Every player on the books. */
export function allPlayers(): Array<Omit<Lot, 'id' | 'set'>> {
  return ROLES.flatMap((role) =>
    PLAYERS[role].map((entry) => {
      const [name, code, points] = entry.split('|');
      const rating = Number(points);
      return { name, role, rating, base: basePrice(rating), overseas: code !== 'IND', country: COUNTRY[code].name, flag: COUNTRY[code].flag };
    }),
  );
}

/** Every player in the order they come up that day: marquee set, a set per role, then the value set. */
export function generatePool(seed: number): Lot[] {
  const rand = rng(mix(seed, 1));
  const players = shuffled(allPlayers(), rand);

  // Ties for the last marquee places fall differently each day because of the shuffle above
  const marquee = [...players].sort((a, b) => b.rating - a.rating).slice(0, MARQUEE_COUNT);
  const rest = players.filter((p) => !marquee.includes(p));
  const ordered = [
    ...shuffled(marquee, rand).map((p) => ({ ...p, set: 'Marquee set' })),
    ...SET_ORDER.flatMap((role) =>
      shuffled(rest.filter((p) => p.role === role && p.rating >= VALUE_SET_BELOW), rand).map((p) => ({ ...p, set: ROLE_SET[role] })),
    ),
    ...shuffled(rest.filter((p) => p.rating < VALUE_SET_BELOW), rand).map((p) => ({ ...p, set: 'Value picks' })),
  ];
  return ordered.map((p, id) => ({ id, ...p }));
}

export function generateRivals(seed: number): Rival[] {
  const rand = rng(mix(seed, 2));
  const names = shuffled(RIVAL_NAMES, rand).slice(0, RIVAL_COUNT);
  const styles: RivalStyle[] = ['stars', 'value', 'balanced'];
  const offset = Math.floor(rand() * 3);
  return names.map((name, i) => ({ name, style: styles[(i + offset) % 3] }));
}

export function newTeams(): Team[] {
  return Array.from({ length: TEAM_COUNT }, () => ({ purse: BUDGET, squad: [] }));
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
  const x = Math.max(0, Math.min(1, (rating - 60) / 39));
  return 30 + 1500 * Math.pow(x, 1.5);
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
    const richness = team.purse / slots / (BUDGET / SQUAD_SIZE);
    if (round === 1) {
      const bar = 62 + 8 * Math.max(0, Math.min(1.5, richness - 0.7));
      const betterToCome = upcoming.filter((p) => p.role === lot.role && p.rating >= bar).length;
      if (lot.rating < bar && betterToCome >= (needsRole ? short[lot.role] : 1) + 3) {
        out.push(0);
        continue;
      }
    }

    const style = rivals[r].style;
    // Rivals bid a little under a player's worth, which leaves room for a sharp bidder
    let m = 0.7;
    if (style === 'stars') m *= lot.rating >= 88 ? 1.25 : 0.85;
    else if (style === 'value') m *= lot.rating >= 74 && lot.rating <= 87 ? 1.12 : 0.9;

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
    // No single player takes more than 30% of a full purse
    limit = Math.min(limit, BUDGET * 0.3);
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

export function newAuction(pool: readonly Lot[]): Auction {
  return { teams: newTeams(), round: 1, queue: pool.map((p) => p.id), unsold: [], done: pool.length === 0 };
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
  // Once every squad is full there is nobody left to bid
  if (teams.every((t) => t.squad.length >= SQUAD_SIZE)) return { teams, round: a.round, queue: [], unsold: [], done: true };
  const queue = a.queue.slice(1);
  const unsold = result.winner === null && a.round === 1 ? [...a.unsold, lot.id] : a.unsold;
  if (queue.length > 0) return { teams, round: a.round, queue, unsold, done: false };
  if (a.round === 1 && unsold.length > 0) return { teams, round: 2, queue: unsold, unsold: [], done: false };
  return { teams, round: a.round, queue: [], unsold: [], done: true };
}

/** The squad objectives and whether this squad meets each one. */
export function objectives(team: Team): Objective[] {
  const count = (role: Role) => team.squad.filter((p) => p.role === role).length;
  return [
    { label: `Sign all ${SQUAD_SIZE} players`, met: team.squad.length >= SQUAD_SIZE },
    { label: `${REQUIRED.BAT} or more batters`, met: count('BAT') >= REQUIRED.BAT },
    { label: `${REQUIRED.WK} or more wicketkeepers`, met: count('WK') >= REQUIRED.WK },
    { label: `${REQUIRED.AR} or more all-rounders`, met: count('AR') >= REQUIRED.AR },
    { label: `${REQUIRED.PACE} or more fast bowlers`, met: count('PACE') >= REQUIRED.PACE },
    { label: `${REQUIRED.SPIN} or more spinners`, met: count('SPIN') >= REQUIRED.SPIN },
  ];
}

/** Team points: every player's points added up, plus a bonus for each objective met. */
export function squadScore(team: Team): number {
  const players = team.squad.slice(0, SQUAD_SIZE).reduce((a, p) => a + p.rating, 0);
  return players + OBJECTIVE_POINTS * objectives(team).filter((o) => o.met).length;
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
  let a = newAuction(pool);
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
