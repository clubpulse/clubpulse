export type FormTrend = 'rising' | 'falling' | 'steady';

export type FormRating = {
  user_id:        string;
  club_id:        string;
  rating:         number;        // 0-100 scale
  trend:          FormTrend;
  last_5_scores:  number[];      // last 5 run scores, most recent first
  last_5_wickets: number[];      // last 5 wicket hauls, most recent first
  matches_played: number;
  updated_at:     string;
};

export type ClubFormGuideEntry = FormRating & {
  full_name:    string;
  display_name: string;
};
