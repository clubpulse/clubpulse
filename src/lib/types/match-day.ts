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
}
