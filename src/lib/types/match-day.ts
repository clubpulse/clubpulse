export type ScorecardStatus = 'setup' | 'our_batting' | 'our_bowling' | 'completed';
export type EventType = 'update' | 'milestone' | 'wicket' | 'boundary' | 'six' | 'result';

export interface InningsState {
  runs: number;
  wickets: number;
  overs: string;
  extras: number;
}

export interface MatchScorecard {
  id: string;
  club_id: string;
  match_date: string;
  opposition: string;
  venue?: string;
  our_innings: InningsState;
  their_innings: InningsState;
  status: ScorecardStatus;
  result?: string;
  scorer_user_id?: string;
  /** Token for the public read-only link at /live/[token]. */
  share_token?: string;
  fixture_id?: string | null;
}

export interface MatchPlayerScore {
  id: string;
  scorecard_id: string;
  user_id: string;
  runs: number;
  balls_faced: number;
  fours: number;
  sixes: number;
  how_out?: string;
  batting_position?: number;
  overs_bowled: number;
  runs_conceded: number;
  wickets: number;
  maidens: number;
  catches: number;
  run_outs: number;
  stumpings: number;
  creds_awarded: number;
}

export interface MatchCommentary {
  id: string;
  scorecard_id: string;
  message: string;
  event_type: EventType;
  created_at: string;
}

export interface ScorecardWithDetails {
  scorecard: MatchScorecard;
  playerScores: MatchPlayerScore[];
  commentary: MatchCommentary[];
  /** Latest balls, newest first. Empty until the scorer uses the ball pad. */
  deliveries: import('@/lib/match-day/scoring').Delivery[];
}

export interface RosterPlayer {
  user_id: string;
  name: string;
  /** In the confirmed XI for this fixture. */
  in_xi: boolean;
}
