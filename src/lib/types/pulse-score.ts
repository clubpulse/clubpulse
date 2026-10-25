export interface PulseScoreComponents {
  scores_activity: number   // max 20
  availability: number      // max 25
  mentor: number            // max 15
  community: number         // max 15
  volunteer: number         // max 15
  fixture: number           // max 10
}

export interface ClubPulseScore {
  id: string
  club_id: string
  score: number
  component_scores: PulseScoreComponents
  calculated_at: string
  snapshot_week: string
}

export type PulseRating = 'Thriving' | 'Active' | 'Steady' | 'Quiet' | 'Dormant'

export function getPulseRating(score: number): PulseRating {
  if (score >= 80) return 'Thriving'
  if (score >= 60) return 'Active'
  if (score >= 40) return 'Steady'
  if (score >= 20) return 'Quiet'
  return 'Dormant'
}

export function getPulseColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-yellow-600'
  if (score >= 20) return 'text-orange-600'
  return 'text-red-600'
}

export const COMPONENT_CONFIG: Record<keyof PulseScoreComponents, { label: string; maxScore: number; description: string }> = {
  scores_activity: { label: 'Scores Activity', maxScore: 20, description: 'Members earning and spending Scores' },
  availability:    { label: 'Match Availability', maxScore: 25, description: 'Players submitting availability for fixtures' },
  mentor:          { label: 'Mentoring', maxScore: 15, description: 'Active mentor sessions this month' },
  community:       { label: 'Community', maxScore: 15, description: 'Pot contributions, charity donations, raffles' },
  volunteer:       { label: 'Volunteering', maxScore: 15, description: 'Volunteer sessions completed' },
  fixture:         { label: 'Fixtures', maxScore: 10, description: 'Match completion rate' },
}
