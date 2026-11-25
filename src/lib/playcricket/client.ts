// Read-only Play-Cricket v2 calls. The token is a query param because that is how the API
// authenticates. Callers must not log the URL.

const BASE = 'https://play-cricket.com/api/v2';

export type PlayResponse = { status: number; body: unknown };

export type PlayFetch = (url: string) => Promise<PlayResponse>;

export function playCricketUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function matchListUrl(siteId: string, token: string, season: string, from: string, to: string): string {
  return playCricketUrl('matches.json', {
    site_id: siteId,
    season,
    api_token: token,
    from_entry_date: from,
    end_entry_date: to,
  });
}

export function resultSummaryUrl(siteId: string, token: string, season: string, from: string, to: string): string {
  return playCricketUrl('result_summary.json', {
    site_id: siteId,
    season,
    api_token: token,
    from_entry_date: from,
    end_entry_date: to,
  });
}

export function scorecardUrl(token: string, matchId: string): string {
  return playCricketUrl('match_detail.json', { match_id: matchId, api_token: token });
}

export async function playGet(fetchImpl: PlayFetch, url: string): Promise<{ ok: true; body: unknown } | { ok: false; stop: boolean; error: string }> {
  let status = 0;
  try {
    const res = await fetchImpl(url);
    status = res.status;
    if (status === 429 || status >= 500) {
      return { ok: false, stop: true, error: 'Play-Cricket asked us to slow down. The next sync will try again.' };
    }
    if (status === 401 || status === 403) {
      return { ok: false, stop: true, error: 'Play-Cricket refused the club key. Ask the club admin to check or rotate it.' };
    }
    if (status >= 400) return { ok: false, stop: false, error: 'Play-Cricket did not return that data.' };
    return { ok: true, body: res.body };
  } catch {
    return { ok: false, stop: true, error: 'Play-Cricket could not be reached. The next sync will try again.' };
  }
}

export type StoredMatch = {
  playMatchId: string;
  season: string | null;
  matchDate: string | null;
  matchTime: string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  competitionType: string | null;
  status: string | null;
  groundName: string | null;
  lastUpdated: string | null;
};

export type StoredResult = {
  playMatchId: string;
  resultText: string | null;
  homeRuns: number | null;
  homeWickets: number | null;
  awayRuns: number | null;
  awayWickets: number | null;
};

export type StoredPlayer = {
  playMatchId: string;
  teamId: string | null;
  teamName: string | null;
  playerName: string;
  role: 'bat' | 'bowl';
};

const text = (v: unknown): string | null => (v === null || v === undefined || v === '' ? null : String(v));
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function parseMatches(body: unknown): StoredMatch[] {
  const list = Array.isArray((body as { matches?: unknown })?.matches) ? (body as { matches: unknown[] }).matches : [];
  const out: StoredMatch[] = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const m = row as Record<string, unknown>;
    const id = text(m.id);
    if (!id || m.status === 'Deleted') continue;
    out.push({
      playMatchId: id,
      season: text(m.season),
      matchDate: text(m.match_date),
      matchTime: text(m.match_time),
      homeTeamName: text(m.home_team_name),
      awayTeamName: text(m.away_team_name),
      homeTeamId: text(m.home_team_id),
      awayTeamId: text(m.away_team_id),
      competitionType: text(m.competition_type),
      status: text(m.status),
      groundName: text(m.ground_name),
      lastUpdated: text(m.last_updated),
    });
  }
  return out;
}

export function parseResults(body: unknown): StoredResult[] {
  const list = Array.isArray((body as { matches?: unknown })?.matches)
    ? (body as { matches: unknown[] }).matches
    : Array.isArray((body as { result_summary?: unknown })?.result_summary)
      ? (body as { result_summary: unknown[] }).result_summary
      : [];
  const out: StoredResult[] = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const m = row as Record<string, unknown>;
    const id = text(m.id ?? m.match_id);
    if (!id) continue;
    const innings = Array.isArray(m.innings) ? m.innings as Record<string, unknown>[] : [];
    const home = innings[0];
    const away = innings[1];
    out.push({
      playMatchId: id,
      resultText: text(m.result_description ?? m.result ?? m.match_result),
      homeRuns: num(home?.runs),
      homeWickets: num(home?.wickets),
      awayRuns: num(away?.runs),
      awayWickets: num(away?.wickets),
    });
  }
  return out;
}

function peopleFrom(list: unknown, role: 'bat' | 'bowl', teamId: string | null, teamName: string | null, matchId: string): StoredPlayer[] {
  if (!Array.isArray(list)) return [];
  const out: StoredPlayer[] = [];
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    const p = row as Record<string, unknown>;
    const name = text(p.batsman_name ?? p.bowler_name ?? p.player_name ?? p.name);
    if (!name) continue;
    out.push({ playMatchId: matchId, teamId: text(p.team_id) ?? teamId, teamName, playerName: name, role });
  }
  return out;
}

/** Names and team only. Anything else in the payload is dropped. */
export function parseScorecard(matchId: string, body: unknown): StoredPlayer[] {
  const root = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const detail = (root.match_detail && typeof root.match_detail === 'object' ? root.match_detail : root) as Record<string, unknown>;
  const innings = Array.isArray(detail.innings) ? detail.innings as Record<string, unknown>[] : [];
  const players: StoredPlayer[] = [];
  for (const inn of innings) {
    const teamId = text(inn.team_batting_id ?? inn.team_id);
    const teamName = text(inn.team_batting_name ?? inn.team_name);
    players.push(...peopleFrom(inn.batsmen ?? inn.batters, 'bat', teamId, teamName, matchId));
    players.push(...peopleFrom(inn.bowlers, 'bowl', teamId, teamName, matchId));
  }
  return players;
}
