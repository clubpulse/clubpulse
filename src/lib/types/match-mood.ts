export type MoodType = 'pumped' | 'nervous' | 'tired' | 'focused' | 'injured' | 'unknown'

export const MOOD_CONFIG: Record<MoodType, { emoji: string; label: string; color: string }> = {
  pumped:   { emoji: '🔥', label: 'Pumped',   color: 'text-orange-500' },
  nervous:  { emoji: '😬', label: 'Nervous',  color: 'text-yellow-500' },
  tired:    { emoji: '😴', label: 'Tired',    color: 'text-slate-400'  },
  focused:  { emoji: '🎯', label: 'Focused',  color: 'text-blue-500'   },
  injured:  { emoji: '🩹', label: 'Injured',  color: 'text-red-500'    },
  unknown:  { emoji: '🤷', label: 'Unknown',  color: 'text-gray-400'   },
}

export interface MatchMood {
  id: string
  user_id: string
  fixture_id: string
  mood: MoodType
  set_at: string
}

export interface MoodCorrelation {
  mood: MoodType
  total_games: number
  avg_runs: number
  avg_wickets: number
  avg_form_rating: number
}

export interface TeamMoodSummary {
  fixture_id: string
  moods: Record<MoodType, number>  // count per mood
  total_responses: number
  squad_size: number
}
