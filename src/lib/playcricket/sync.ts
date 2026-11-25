import type { SupabaseClient } from '@supabase/supabase-js';
import { decryptApiKey, encryptionSecret } from './crypto';
import {
  matchListUrl,
  parseMatches,
  parseResults,
  parseScorecard,
  playGet,
  resultSummaryUrl,
  scorecardUrl,
  type PlayFetch,
  type StoredMatch,
  type StoredPlayer,
  type StoredResult,
} from './client';
import { playCricketSyncEnabled } from './flag';

const SCORECARD_CAP = 15;

export function entryWindow(now: Date): { from: string; to: string; season: string } {
  const fromDate = new Date(now.getTime() - 86_400_000);
  const dmy = (d: Date) => {
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getUTCFullYear()}`;
  };
  return { from: dmy(fromDate), to: dmy(now), season: String(now.getUTCFullYear()) };
}

type ConnectionRow = {
  club_id: string;
  site_id: string;
  key_ciphertext: string;
  key_iv: string;
  next_attempt_at: string | null;
};

export async function syncPlayCricket(admin: SupabaseClient, fetchImpl: PlayFetch, now = new Date(), env: Record<string, string | undefined> = process.env): Promise<{ clubs: number; skipped: boolean }> {
  if (!playCricketSyncEnabled(env)) return { clubs: 0, skipped: true };
  const { data } = await admin.from('playcricket_connections').select('club_id, site_id, key_ciphertext, key_iv, next_attempt_at');
  let clubs = 0;
  for (const row of (data ?? []) as ConnectionRow[]) {
    if (row.next_attempt_at && new Date(row.next_attempt_at).getTime() > now.getTime()) continue;
    await syncOne(admin, fetchImpl, row, now, env);
    clubs += 1;
  }
  return { clubs, skipped: false };
}

async function syncOne(admin: SupabaseClient, fetchImpl: PlayFetch, row: ConnectionRow, now: Date, env: Record<string, string | undefined>) {
  const window = entryWindow(now);
  let token = '';
  try {
    token = decryptApiKey(row.key_ciphertext, row.key_iv, encryptionSecret(env));
  } catch {
    await admin.from('playcricket_connections').update({ last_error: 'The stored club key could not be read.', next_attempt_at: new Date(now.getTime() + 12 * 3600_000).toISOString() }).eq('club_id', row.club_id);
    return;
  }

  const matches = await playGet(fetchImpl, matchListUrl(row.site_id, token, window.season, window.from, window.to));
  if (!matches.ok) return finish(admin, row.club_id, now, matches.error, matches.stop);
  const parsedMatches = parseMatches(matches.body);
  if (parsedMatches.length) await upsertMatches(admin, row.club_id, parsedMatches, now);

  const results = await playGet(fetchImpl, resultSummaryUrl(row.site_id, token, window.season, window.from, window.to));
  if (!results.ok) return finish(admin, row.club_id, now, results.error, results.stop);
  const parsedResults = parseResults(results.body);
  if (parsedResults.length) await upsertResults(admin, row.club_id, parsedResults, now);

  const recentIds = parsedResults.map((r) => r.playMatchId).slice(0, SCORECARD_CAP);
  for (const matchId of recentIds) {
    const card = await playGet(fetchImpl, scorecardUrl(token, matchId));
    if (!card.ok) return finish(admin, row.club_id, now, card.error, card.stop);
    const players = parseScorecard(matchId, card.body);
    if (players.length) await upsertPlayers(admin, row.club_id, matchId, players, now);
  }
  await finish(admin, row.club_id, now, null, false);
}

async function finish(admin: SupabaseClient, clubId: string, now: Date, error: string | null, backoff: boolean) {
  const patch: Record<string, string | null> = {
    last_error: error,
    next_attempt_at: backoff ? new Date(now.getTime() + 12 * 3600_000).toISOString() : null,
  };
  if (!error) patch.last_sync_at = now.toISOString();
  await admin.from('playcricket_connections').update(patch).eq('club_id', clubId);
}

async function upsertMatches(admin: SupabaseClient, clubId: string, rows: StoredMatch[], now: Date) {
  await admin.from('playcricket_matches').upsert(rows.map((r) => ({
    club_id: clubId,
    play_match_id: r.playMatchId,
    season: r.season,
    match_date: r.matchDate,
    match_time: r.matchTime,
    home_team_name: r.homeTeamName,
    away_team_name: r.awayTeamName,
    home_team_id: r.homeTeamId,
    away_team_id: r.awayTeamId,
    competition_type: r.competitionType,
    status: r.status,
    ground_name: r.groundName,
    last_updated: r.lastUpdated,
    synced_at: now.toISOString(),
  })), { onConflict: 'club_id,play_match_id' });
}

async function upsertResults(admin: SupabaseClient, clubId: string, rows: StoredResult[], now: Date) {
  await admin.from('playcricket_results').upsert(rows.map((r) => ({
    club_id: clubId,
    play_match_id: r.playMatchId,
    result_text: r.resultText,
    home_runs: r.homeRuns,
    home_wickets: r.homeWickets,
    away_runs: r.awayRuns,
    away_wickets: r.awayWickets,
    synced_at: now.toISOString(),
  })), { onConflict: 'club_id,play_match_id' });
}

async function upsertPlayers(admin: SupabaseClient, clubId: string, matchId: string, rows: StoredPlayer[], now: Date) {
  await admin.from('playcricket_scorecard_players').delete().eq('club_id', clubId).eq('play_match_id', matchId);
  await admin.from('playcricket_scorecard_players').insert(rows.map((r) => ({
    club_id: clubId,
    play_match_id: r.playMatchId,
    team_id: r.teamId,
    team_name: r.teamName,
    player_name: r.playerName,
    role: r.role,
    synced_at: now.toISOString(),
  })));
}
