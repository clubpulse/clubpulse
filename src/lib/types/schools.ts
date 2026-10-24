export type AgeGroup = 'U11' | 'U13' | 'U15' | 'U18' | 'Open'
export type SessionType = 'training' | 'match' | 'tour' | 'other'

export const AGE_GROUP_CONFIG: Record<AgeGroup, { label: string; color: string }> = {
  U11: { label: 'Under 11s', color: '#3b82f6' },
  U13: { label: 'Under 13s', color: '#22c55e' },
  U15: { label: 'Under 15s', color: '#eab308' },
  U18: { label: 'Under 18s', color: '#f97316' },
  Open: { label: 'Open Age',  color: '#a855f7' },
}

export const AGE_GROUPS: AgeGroup[] = ['U11', 'U13', 'U15', 'U18', 'Open']

export interface SchoolProgram {
  id: string
  club_id: string
  school_name: string
  age_groups: AgeGroup[]
  is_active: boolean
}

export interface SchoolAgeGroup {
  id: string
  club_id: string
  user_id: string
  age_group: AgeGroup
  academic_year: number
}

export interface SchoolAttendance {
  id: string
  club_id: string
  session_date: string
  session_type: SessionType
  session_name?: string
  age_group?: AgeGroup
  attendees: string[]
}

export interface SchoolTeamSelection {
  id: string
  club_id: string
  match_date: string
  opposition: string
  age_group: AgeGroup
  selected_players: string[]
  notes?: string
}
