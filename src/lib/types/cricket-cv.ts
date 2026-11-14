export type BattingStyle = 'right_hand' | 'left_hand'
export type BowlingStyle =
  | 'right_arm_fast'
  | 'right_arm_medium'
  | 'right_arm_off_spin'
  | 'right_arm_leg_spin'
  | 'left_arm_fast'
  | 'left_arm_medium'
  | 'left_arm_orthodox'
  | 'left_arm_chinaman'
  | 'does_not_bowl'
export type PrimaryRole =
  | 'batsman'
  | 'bowler'
  | 'allrounder'
  | 'wicketkeeper'
  | 'wicketkeeper_batsman'
  | 'coach'
  | 'umpire'

export const BATTING_STYLE_LABELS: Record<BattingStyle, string> = {
  right_hand: 'Right-hand Bat',
  left_hand: 'Left-hand Bat',
}

export const BOWLING_STYLE_LABELS: Record<BowlingStyle, string> = {
  right_arm_fast: 'Right-arm Fast',
  right_arm_medium: 'Right-arm Medium',
  right_arm_off_spin: 'Right-arm Off-spin',
  right_arm_leg_spin: 'Right-arm Leg-spin',
  left_arm_fast: 'Left-arm Fast',
  left_arm_medium: 'Left-arm Medium',
  left_arm_orthodox: 'Left-arm Orthodox',
  left_arm_chinaman: 'Left-arm Chinaman',
  does_not_bowl: 'Does Not Bowl',
}

export const PRIMARY_ROLE_LABELS: Record<PrimaryRole, string> = {
  batsman: 'Batsman',
  bowler: 'Bowler',
  allrounder: 'All-rounder',
  wicketkeeper: 'Wicket-keeper',
  wicketkeeper_batsman: 'Wicket-keeper Batsman',
  coach: 'Coach',
  umpire: 'Umpire',
}

export interface CricketCVProfile {
  id: string
  user_id: string
  share_slug?: string
  is_public: boolean
  display_name?: string
  tagline?: string
  avatar_url?: string
  date_of_birth_year?: number
  batting_style?: BattingStyle
  bowling_style?: BowlingStyle
  primary_role?: PrimaryRole
  highest_level?: string
  years_playing?: number
  clubs_played_for?: string
  personal_statement?: string
  show_badges: boolean
  show_qualifications: boolean
  show_scores_balance: boolean
  updated_at: string
}

export interface CVSeasonStats {
  id: string
  user_id: string
  season: number
  club_name: string
  matches_played: number
  runs_scored: number
  wickets_taken: number
  catches: number
  stumpings: number
  batting_average?: number
  bowling_average?: number
  highest_score?: number
  best_bowling?: string
}

export interface FullCricketCV {
  profile: CricketCVProfile
  seasonStats: CVSeasonStats[]
  badges?: { name: string; emoji: string; rarity: string; awarded_at: string }[]
  qualifications?: { name: string; category: string; completed_date: string; is_verified: boolean }[]
  currentClub?: string
}
