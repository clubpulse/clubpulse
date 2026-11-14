export type MilestoneCategory = 'victory'|'record'|'founding'|'tradition'|'player'|'ground'|'competition'|'other'

export const MILESTONE_CATEGORY_CONFIG: Record<MilestoneCategory, { emoji: string; label: string }> = {
  victory:     { emoji: '🏆', label: 'Victory' },
  record:      { emoji: '📊', label: 'Record' },
  founding:    { emoji: '🌱', label: 'Founding' },
  tradition:   { emoji: '🎭', label: 'Tradition' },
  player:      { emoji: '🌟', label: 'Notable Player' },
  ground:      { emoji: '🏟️', label: 'Ground' },
  competition: { emoji: '🏅', label: 'Competition' },
  other:       { emoji: '📝', label: 'Other' },
}

export interface ClubMilestone {
  id: string
  club_id: string
  year: number
  title: string
  description: string
  category: MilestoneCategory
  is_featured: boolean
  added_by?: string
  created_at: string
}

export interface ClubBible {
  id: string
  club_id: string
  generated_narrative?: string
  last_generated_at?: string
  generation_count: number
}

export interface AddMilestoneInput {
  club_id: string
  year: number
  title: string
  description: string
  category: MilestoneCategory
  is_featured?: boolean
}
