export type LegacyStatus = 'active' | 'retired' | 'departed' | 'legend'

export const STATUS_CONFIG: Record<LegacyStatus, { label: string; color: string; emoji: string }> = {
  active:   { label: 'Current Player',  color: 'text-green-600',  emoji: '🟢' },
  retired:  { label: 'Retired',         color: 'text-amber-600',  emoji: '🏆' },
  departed: { label: 'Moved On',        color: 'text-gray-600',   emoji: '👋' },
  legend:   { label: 'Club Legend',     color: 'text-purple-600', emoji: '⭐' },
}

export interface PlayerLegacy {
  id: string
  user_id: string
  club_id: string
  display_name: string
  nickname?: string
  years_at_club: string
  primary_role: string
  career_summary: string
  career_highlight?: string
  best_season?: string
  total_matches?: number
  total_runs?: number
  total_wickets?: number
  honours?: string[]
  quote?: string
  photo_url?: string
  status: LegacyStatus
  inducted_at: string
  is_published: boolean
}
