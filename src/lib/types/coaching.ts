export type CoachingType = 'batting'|'bowling'|'fielding'|'wicketkeeping'|'fitness'|'allround'|'mental'
export type SessionFormat = 'individual'|'group'|'online'
export type BookingStatus = 'pending'|'confirmed'|'completed'|'cancelled'|'no_show'

export const COACHING_TYPE_CONFIG: Record<CoachingType, { emoji: string; label: string }> = {
  batting:        { emoji: '🏏', label: 'Batting' },
  bowling:        { emoji: '⚾', label: 'Bowling' },
  fielding:       { emoji: '🤸', label: 'Fielding' },
  wicketkeeping:  { emoji: '🧤', label: 'Wicketkeeping' },
  fitness:        { emoji: '💪', label: 'Fitness' },
  allround:       { emoji: '🌟', label: 'All-Round' },
  mental:         { emoji: '🧠', label: 'Mental Skills' },
}

export const SESSION_FORMAT_LABEL: Record<SessionFormat, string> = {
  individual: 'Individual',
  group: 'Group',
  online: 'Online',
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

export interface CoachingListing {
  id: string
  coach_user_id: string
  club_id: string
  title: string
  description?: string
  coaching_type: CoachingType
  session_format: SessionFormat
  duration_minutes: number
  max_players: number
  scores_cost: number
  qualification?: string
  location?: string
  is_active: boolean
  total_sessions_delivered: number
  avg_rating?: number
  coach_profile?: { full_name: string }
}

export interface CoachingBooking {
  id: string
  listing_id: string
  player_user_id: string
  coach_user_id: string
  session_date: string
  session_time?: string
  status: BookingStatus
  scores_paid: number
  player_rating?: number
  player_feedback?: string
  coach_notes?: string
  booked_at: string
  confirmed_at?: string
  completed_at?: string
  listing?: CoachingListing
}
