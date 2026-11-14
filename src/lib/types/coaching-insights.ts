export type CoachingInsight = {
  id: string;
  player_id: string;
  match_id: string;
  generated_at: string;
  tier: number;
  insight_type: string;
  finding: string;
  recommendation: string;
  acknowledged: boolean;
};
