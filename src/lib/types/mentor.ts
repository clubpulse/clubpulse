export type BattingStyle = 'right-hand' | 'left-hand'
export type BowlingStyle =
  | 'right-arm-fast'
  | 'right-arm-medium'
  | 'right-arm-spin'
  | 'left-arm-fast'
  | 'left-arm-medium'
  | 'left-arm-spin'
  | 'none'
export type Speciality = 'batting' | 'bowling' | 'fielding' | 'wicketkeeping' | 'allround'
export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'

export interface MentorProfile {
  id: string
  user_id: string
  club_id: string
  batting_style?: BattingStyle
  bowling_style?: BowlingStyle
  speciality?: Speciality
  years_experience: number
  bio?: string
  max_mentees: number
  is_available: boolean
  total_sessions: number
  avg_rating?: number
  profile?: { full_name: string; avatar_url?: string }
}

export interface MentorRequest {
  id: string
  mentee_user_id: string
  mentor_user_id: string
  club_id: string
  status: RequestStatus
  message?: string
  created_at: string
  mentor_profile?: MentorProfile
}

export interface MentorSession {
  id: string
  request_id: string
  mentor_user_id: string
  mentee_user_id: string
  session_date: string
  duration_minutes: number
  notes?: string
  mentee_rating?: number
  mentor_creds_awarded: number
  mentee_creds_awarded: number
}
