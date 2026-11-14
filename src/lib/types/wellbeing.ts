export interface WellbeingCheckin {
  id: string
  user_id: string
  club_id: string
  check_week: string
  physical_rating: number
  mental_rating: number
  notes?: string
}

export interface WellbeingAggregate {
  check_week: string
  total_responses: number
  avg_physical: number
  avg_mental: number
  physical_concern_count: number
  mental_concern_count: number
  physical_good_count: number
  mental_good_count: number
}

export const RATING_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
  1: { label: 'Really struggling', emoji: '😰', color: 'text-red-600' },
  2: { label: 'Not great',         emoji: '😕', color: 'text-orange-600' },
  3: { label: 'OK',                emoji: '😐', color: 'text-yellow-600' },
  4: { label: 'Good',              emoji: '🙂', color: 'text-green-600' },
  5: { label: 'Feeling great',     emoji: '😄', color: 'text-emerald-600' },
}
