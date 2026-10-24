export type MatchPerformance = {
  id: string;
  club_id: string;
  match_date: string;
  opponent: string;
  user_id: string;
  runs_scored: number;
  balls_faced: number;
  dismissal_type: string | null;
  dismissed_by: string | null;
  overs_bowled: number;
  runs_conceded: number;
  wickets_taken: number;
  catches: number;
  run_outs: number;
  created_at: string;
};

export type NemesisPair = {
  id: string;
  batter_id: string;
  bowler_id: string;
  dismissals: number;
  last_dismissal: string | null;
  updated_at: string;
  bowler_name?: string;
  batter_name?: string;
};

export type RivalryStats = {
  batter: { id: string; name: string };
  bowler: { id: string; name: string };
  dismissals: number;
  lastDismissal: string | null;
  h2h: {
    ballsFaced: number;
    runsScored: number;
    wicketsTaken: number;
    runsConceded: number;
  };
  encounters: MatchPerformance[];
};
