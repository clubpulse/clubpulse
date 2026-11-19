// Pure. Season Manager: run a club side through an eight-match season.
//
// You have a squad of 16 invented players. Before each match you pick eleven and a game plan.
// Playing tires people, resting restores them, and form moves with how they did, so the same
// best eleven cannot play every week. The match itself is worked out here from the season's seed,
// the match number and your selection, so the same choices always give the same result and the
// server can replay a whole season to check it.

export const SQUAD_SIZE = 16;
export const SEASON_MATCHES = 8;
export const TEAM_SIZE = 11;
export const MIN_BOWLERS = 5;
export const PLANS = ['steady', 'balanced', 'attack'] as const;
export type Plan = (typeof PLANS)[number];
export type Role = 'bat' | 'bowl' | 'all' | 'keep';

export type Player = { id: number; name: string; role: Role; bat: number; bowl: number; form: number; fatigue: number };
export type Rival = { name: string; strength: number };
export type TableRow = { name: string; played: number; won: number; points: number; you: boolean };
export type MatchReport = {
  match: number;
  opponent: string;
  yourScore: number;
  theirScore: number;
  won: boolean;
  tied: boolean;
  topBatter: { name: string; runs: number };
  topBowler: { name: string; wickets: number };
  note: string;
};
export type Season = {
  seed: number;
  squad: Player[];
  rivals: Rival[];
  /** Index into rivals for each match, in order. */
  fixtures: number[];
  reports: MatchReport[];
  /** Wins for each rival from their other games, updated as the season goes. */
  rivalWins: number[];
};
export type Selection = { xi: number[]; plan: Plan };

const FIRST = ['Arjun', 'Tom', 'Imran', 'Callum', 'Dev', 'Josh', 'Kwame', 'Liam', 'Mo', 'Nikhil', 'Ollie', 'Priyan', 'Ravi', 'Sam', 'Theo', 'Will', 'Zak', 'Ben', 'Harry', 'Jay'];
const LAST = ['Ahmed', 'Bailey', 'Chowdhury', 'Davies', 'Evans', 'Fernando', 'Green', 'Hussain', 'Iyer', 'Jones', 'Khan', 'Lewis', 'Mensah', 'Nair', 'Okafor', 'Patel', 'Reid', 'Singh', 'Taylor', 'Walker'];
const CLUBS = ['Ashby Park', 'Brookfield', 'Castle Hill', 'Downham', 'Elm Green', 'Foxley', 'Greywell'];
const ROLES: Role[] = ['bat', 'bat', 'bat', 'bat', 'bat', 'keep', 'keep', 'all', 'all', 'all', 'bowl', 'bowl', 'bowl', 'bowl', 'bowl', 'bowl'];

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
const int = (r: () => number, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function shuffle<T>(items: readonly T[], r: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** A new season: squad, seven rival clubs and the order you meet them (one of them twice). */
export function createSeason(seed: number): Season {
  const r = rng(seed);
  const firsts = shuffle(FIRST, r);
  const lasts = shuffle(LAST, r);
  const squad: Player[] = ROLES.map((role, id) => {
    const bat = role === 'bowl' ? int(r, 20, 45) : role === 'all' ? int(r, 45, 70) : role === 'keep' ? int(r, 45, 72) : int(r, 55, 88);
    const bowl = role === 'bat' || role === 'keep' ? int(r, 5, 25) : role === 'all' ? int(r, 45, 70) : int(r, 55, 88);
    return { id, name: `${firsts[id]} ${lasts[id]}`, role, bat, bowl, form: 0, fatigue: 0 };
  });
  const rivals: Rival[] = shuffle(CLUBS, r).map((name) => ({ name, strength: int(r, 44, 66) }));
  const order = shuffle(rivals.map((_, i) => i), r);
  const fixtures = [...order, order[int(r, 0, order.length - 1)]].slice(0, SEASON_MATCHES);
  return { seed, squad, rivals, fixtures, reports: [], rivalWins: rivals.map(() => 0) };
}

/** Why a selection cannot take the field, or null if it can. */
export function selectionError(season: Season, raw: unknown): string | null {
  const sel = (raw ?? {}) as { xi?: unknown; plan?: unknown };
  if (!Array.isArray(sel.xi) || sel.xi.length !== TEAM_SIZE) return `Pick exactly ${TEAM_SIZE} players.`;
  if (!sel.xi.every((id) => typeof id === 'number' && Number.isInteger(id) && id >= 0 && id < season.squad.length)) return 'That team includes someone who is not in your squad.';
  if (new Set(sel.xi).size !== TEAM_SIZE) return 'The same player is picked twice.';
  if (!(PLANS as readonly unknown[]).includes(sel.plan)) return 'Choose a game plan.';
  const picked = (sel.xi as number[]).map((id) => season.squad[id]);
  if (!picked.some((p) => p.role === 'keep')) return 'You need a wicket-keeper.';
  if (picked.filter((p) => p.role === 'bowl' || p.role === 'all').length < MIN_BOWLERS) return `You need at least ${MIN_BOWLERS} bowlers or all-rounders.`;
  return null;
}

/** How well someone plays today: ability, lifted or dragged by form, and worn down by fatigue. */
function effective(base: number, p: Player): number {
  return base * (1 + p.form * 0.06) * (1 - (Math.max(0, p.fatigue - 30) / 70) * 0.35);
}

// Steady loses fewer wickets but scores slower; attack scores faster and loses more. On average
// the three come out close, so the right one depends on the opponent: against a stronger side
// you need the upside of attacking, against a weaker one steady protects what you have.
const PLAN: Record<Plan, { runs: number; risk: number }> = {
  steady: { runs: 0.95, risk: 0.55 },
  balanced: { runs: 1, risk: 1 },
  attack: { runs: 1.13, risk: 1.9 },
};

/**
 * Plays the next match and returns the season after it. Assumes the selection is valid
 * (see selectionError) and that the season is not over.
 */
export function playMatch(season: Season, selection: Selection): Season {
  const match = season.reports.length;
  const rival = season.rivals[season.fixtures[match]];
  const r = rng(season.seed ^ Math.imul(match + 1, 0x9e3779b1));
  const xi = new Set(selection.xi);
  const team = season.squad.filter((p) => xi.has(p.id));
  const plan = PLAN[selection.plan];

  // Batting: the top seven by batting do most of the scoring
  const order = [...team].sort((a, b) => b.bat - a.bat);
  const runsBy = new Map<number, number>();
  let yourScore = int(r, 6, 18); // extras
  order.forEach((p, i) => {
    const weight = i < 7 ? 1 : 0.45;
    const swing = 0.35 + r() * 1.3;
    const failed = r() < 0.12 * plan.risk;
    const runs = failed ? int(r, 0, 6) : Math.round((effective(p.bat, p) / 100) * 34 * weight * swing * plan.runs);
    runsBy.set(p.id, runs);
    yourScore += runs;
  });

  // Bowling: your best five bowlers against their batting
  const attack = [...team].sort((a, b) => b.bowl - a.bowl).slice(0, 5);
  const attackStrength = attack.reduce((a, p) => a + effective(p.bowl, p), 0) / attack.length;
  const keeper = team.some((p) => p.role === 'keep') ? 1 : 0.9;
  const theirScore = Math.max(40, Math.round((rival.strength * 3.1 + int(r, -28, 28)) * (1 - (attackStrength - 55) / 160) / keeper));
  const wicketsBy = new Map<number, number>();
  let wicketsLeft = clamp(Math.round(4 + attackStrength / 12 + int(r, -2, 2)), 2, 10);
  for (const p of shuffle(attack, r).sort((a, b) => effective(b.bowl, b) - effective(a.bowl, a))) {
    const take = Math.min(wicketsLeft, int(r, 0, 3) + (effective(p.bowl, p) > 65 ? 1 : 0));
    wicketsBy.set(p.id, take);
    wicketsLeft -= take;
  }

  const won = yourScore > theirScore;
  const tied = yourScore === theirScore;
  const best = (map: Map<number, number>) => [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  const [batId, batRuns] = best(runsBy);
  const [bowlId, bowlWkts] = best(wicketsBy);
  const name = (id: number) => season.squad[id].name;
  const tired = team.filter((p) => p.fatigue >= 60).length;

  const report: MatchReport = {
    match: match + 1,
    opponent: rival.name,
    yourScore,
    theirScore,
    won,
    tied,
    topBatter: { name: name(batId), runs: batRuns },
    topBowler: { name: name(bowlId), wickets: bowlWkts },
    note: tired >= 3 ? `${tired} of your eleven were tired, and it showed.`
      : selection.plan === 'attack' && !won ? 'The attacking plan cost wickets.'
      : selection.plan === 'steady' && !won && !tied ? 'A steady plan left you a few short.'
      : won ? 'A good day all round.' : 'Small margins. Rotate and go again.',
  };

  // After the match: players tire or recover, and form follows what they did
  const squad = season.squad.map((p) => {
    if (!xi.has(p.id)) return { ...p, fatigue: Math.max(0, p.fatigue - 35), form: p.form > 0 ? p.form - 1 : p.form < 0 ? p.form + 1 : 0 };
    // Bowling is the hard work. Across a full side this roughly balances what five resting
    // players recover, so the squad stays fit only if the workload is shared round.
    const load = p.role === 'bowl' ? 24 : p.role === 'all' ? 20 : p.role === 'keep' ? 14 : 12;
    const runs = runsBy.get(p.id) ?? 0;
    const wkts = wicketsBy.get(p.id) ?? 0;
    const good = runs >= 30 || wkts >= 3;
    const poor = (p.role === 'bat' || p.role === 'keep') ? runs < 8 : p.role === 'bowl' ? wkts === 0 : runs < 8 && wkts === 0;
    return { ...p, fatigue: Math.min(100, p.fatigue + load), form: clamp(p.form + (good ? 1 : poor ? -1 : 0), -2, 2) };
  });

  // The other clubs play each other too
  const rivalWins = season.rivalWins.map((w, i) => {
    const rr = rng(season.seed ^ Math.imul(match + 1, 0x85ebca6b) ^ Math.imul(i + 1, 0xc2b2ae35));
    const beatYou = i === season.fixtures[match] ? (won || tied ? 0 : 1) : null;
    return w + (beatYou ?? (rr() < season.rivals[i].strength / 110 ? 1 : 0));
  });

  return { ...season, squad, reports: [...season.reports, report], rivalWins };
}

export const isOver = (season: Season) => season.reports.length >= SEASON_MATCHES;

/** The league table, best first. A win is 2 points, a tie 1. Ties in the table go to you last. */
export function table(season: Season): TableRow[] {
  const played = season.reports.length;
  const yourWins = season.reports.filter((m) => m.won).length;
  const yourTies = season.reports.filter((m) => m.tied).length;
  const rows: TableRow[] = [
    { name: 'Your club', played, won: yourWins, points: yourWins * 2 + yourTies, you: true },
    ...season.rivals.map((rv, i) => ({ name: rv.name, played, won: season.rivalWins[i], points: season.rivalWins[i] * 2, you: false })),
  ];
  return rows.sort((a, b) => b.points - a.points || Number(a.you) - Number(b.you) || a.name.localeCompare(b.name));
}

export const place = (season: Season) => table(season).findIndex((r) => r.you) + 1;

/** Replays a season from its seed and every selection made. Null if any selection was not allowed. */
export function replaySeason(seed: number, selections: unknown[]): Season | null {
  let season = createSeason(seed);
  for (const sel of selections) {
    if (isOver(season) || selectionError(season, sel)) return null;
    season = playMatch(season, sel as Selection);
  }
  return season;
}

/** A sensible eleven for the next match: the freshest, most in-form side that is allowed to play. */
export function suggestXI(season: Season): number[] {
  const value = (p: Player) => effective(Math.max(p.bat, p.bowl), p);
  const byValue = [...season.squad].sort((a, b) => value(b) - value(a));
  const pick = new Map<number, Player>();
  const keeper = byValue.find((p) => p.role === 'keep');
  if (keeper) pick.set(keeper.id, keeper);
  for (const p of byValue.filter((x) => x.role === 'bowl' || x.role === 'all').slice(0, MIN_BOWLERS)) pick.set(p.id, p);
  for (const p of byValue) {
    if (pick.size >= TEAM_SIZE) break;
    pick.set(p.id, p);
  }
  return [...pick.keys()].sort((a, b) => a - b);
}
