export type BadgeCategory = 'performance' | 'engagement' | 'social' | 'milestone' | 'seasonal'
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

export const RARITY_CONFIG: Record<BadgeRarity, { label: string; color: string; bg: string }> = {
  common:    { label: 'Common',    color: 'text-gray-500',   bg: 'bg-gray-100'   },
  rare:      { label: 'Rare',      color: 'text-blue-600',   bg: 'bg-blue-50'    },
  epic:      { label: 'Epic',      color: 'text-purple-600', bg: 'bg-purple-50'  },
  legendary: { label: 'Legendary', color: 'text-amber-600',  bg: 'bg-amber-50'   },
}

export interface Badge {
  id: string
  slug: string
  name: string
  description: string
  emoji: string
  category: BadgeCategory
  rarity: BadgeRarity
  is_active: boolean
}

export interface PlayerBadge {
  id: string
  user_id: string
  badge_id: string
  club_id: string
  season: number
  awarded_at: string
  awarded_reason?: string
  badge?: Badge
}

export interface LeaderboardEntry {
  club_id: string
  user_id: string
  full_name?: string
  avatar_url?: string
  total_scores: number
  flexi_balance: number
  rank: number
}
