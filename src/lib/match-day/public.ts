// Server-only. Reads one scorecard by its share token for the public /live/[token] page.
// Uses the service role on the server, never in the browser, and returns only a safe payload:
// no user ids, no emails, and juniors are never named.
import { createAdminClient } from '@/lib/supabase/admin';
import { namesAlreadyAuthorised } from '@/lib/profile/lookup';
import type { Delivery } from '@/lib/match-day/scoring';
import type { InningsState, ScorecardStatus } from '@/lib/types/match-day';

export type PublicBatter = { name: string; runs: number; balls: number; fours: number; sixes: number; how_out: string };
export type PublicBowler = { name: string; overs: number; maidens: number; runs: number; wickets: number };
export type PublicBall = { label: string; wicket: boolean };
export type PublicScorecard = {
  clubName: string;
  opposition: string;
  venue: string | null;
  matchDate: string;
  status: ScorecardStatus;
  result: string | null;
  our: InningsState;
  their: InningsState;
  batters: PublicBatter[];
  bowlers: PublicBowler[];
  lastBalls: PublicBall[];
  commentary: { message: string; event_type: string; created_at: string }[];
};

/** "Alex Patel" -> "A. Patel". Juniors are never named. */
export function publicName(fullName: string | null | undefined, isJunior: boolean): string {
  if (isJunior) return 'Junior player';
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Player';
  if (parts.length === 1) return parts[0];
  return `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1]}`;
}

/** One ball as it appears in the "this over" strip: 0, 1, 4, W, Wd, Nb... */
export function ballLabel(d: Pick<Delivery, 'runs_off_bat' | 'extra_type' | 'extra_runs' | 'wicket'>): string {
  if (d.wicket) return 'W';
  if (d.extra_type === 'wide') return d.extra_runs > 1 ? `${d.extra_runs}wd` : 'wd';
  if (d.extra_type === 'no_ball') return d.runs_off_bat > 0 ? `${d.runs_off_bat}nb` : 'nb';
  if (d.extra_type === 'bye') return `${d.extra_runs}b`;
  if (d.extra_type === 'leg_bye') return `${d.extra_runs}lb`;
  return String(d.runs_off_bat);
}

export async function getPublicScorecard(token: string): Promise<PublicScorecard | null> {
  if (!/^[a-f0-9]{16,64}$/i.test(token)) return null;
  const db = createAdminClient();
  const { data: card } = await db.from('match_scorecards').select('*, clubs(name)').eq('share_token', token).maybeSingle();
  if (!card) return null;

  const [{ data: scores }, { data: members }, { data: commentary }, { data: deliveries }] = await Promise.all([
    db.from('match_player_scores').select('*').eq('scorecard_id', card.id).order('batting_position'),
    db.from('club_members').select('user_id, is_junior').eq('club_id', card.club_id),
    db.from('match_commentary').select('message, event_type, created_at').eq('scorecard_id', card.id).order('created_at', { ascending: false }).limit(30),
    db.from('match_deliveries').select('*').eq('scorecard_id', card.id).order('seq', { ascending: false }).limit(12),
  ]);

  // The scorecard token is the authorisation; names come from the service role, never the viewer's own session
  const cards = await namesAlreadyAuthorised((members ?? []).map((m) => m.user_id));
  const nameOf = new Map<string, string>();
  for (const m of members ?? []) {
    nameOf.set(m.user_id as string, publicName(cards.get(m.user_id as string)?.full_name ?? undefined, m.is_junior === true));
  }

  const rows = (scores ?? []) as Array<Record<string, number | string | null>>;
  const batters: PublicBatter[] = rows
    .filter((r) => (r.balls_faced as number) > 0 || (r.runs as number) > 0 || (r.how_out && r.how_out !== 'did not bat'))
    .map((r) => ({
      name: nameOf.get(r.user_id as string) ?? 'Player',
      runs: (r.runs as number) ?? 0,
      balls: (r.balls_faced as number) ?? 0,
      fours: (r.fours as number) ?? 0,
      sixes: (r.sixes as number) ?? 0,
      how_out: (r.how_out as string) ?? 'not out',
    }));
  const bowlers: PublicBowler[] = rows
    .filter((r) => Number(r.overs_bowled) > 0)
    .map((r) => ({
      name: nameOf.get(r.user_id as string) ?? 'Player',
      overs: Number(r.overs_bowled), maidens: (r.maidens as number) ?? 0, runs: (r.runs_conceded as number) ?? 0, wickets: (r.wickets as number) ?? 0,
    }));

  return {
    clubName: (card.clubs as unknown as { name?: string } | null)?.name ?? 'Club',
    opposition: card.opposition as string,
    venue: (card.venue as string | null) ?? null,
    matchDate: card.match_date as string,
    status: card.status as ScorecardStatus,
    result: (card.result as string | null) ?? null,
    our: card.our_innings as InningsState,
    their: card.their_innings as InningsState,
    batters,
    bowlers,
    lastBalls: ((deliveries ?? []) as Delivery[]).map((d) => ({ label: ballLabel(d), wicket: d.wicket })).reverse(),
    commentary: (commentary ?? []) as PublicScorecard['commentary'],
  };
}
