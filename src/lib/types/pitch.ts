export type PitchCondition = 'flat' | 'swing' | 'spin' | 'seam' | 'random'

export const PITCH_CONFIG: Record<PitchCondition, { label: string; emoji: string; description: string; color: string }> = {
  flat:   { label: 'Flat',    emoji: '🏏', description: "Batsman's paradise — expect big scores", color: 'text-green-500' },
  swing:  { label: 'Swing',   emoji: '💨', description: 'Swing heaven — new ball will move', color: 'text-blue-500' },
  spin:   { label: 'Spin',    emoji: '🌀', description: 'Spin minefield — turning square', color: 'text-purple-500' },
  seam:   { label: 'Seam',    emoji: '🌿', description: 'Green seamer — pace & movement', color: 'text-emerald-600' },
  random: { label: 'Random',  emoji: '🎲', description: "Unpredictable — anyone's guess", color: 'text-orange-500' },
}

export interface PitchVote {
  id: string
  user_id: string
  fixture_id: string
  club_id: string
  prediction: PitchCondition
  is_correct: boolean | null
  creds_awarded: number
  created_at: string
}

export interface PitchResult {
  id: string
  fixture_id: string
  club_id: string
  actual_condition: PitchCondition
  notes?: string
  recorded_at: string
}

export interface PitchVoteAggregate {
  condition: PitchCondition
  count: number
  percent: number
}

export interface GroundHistory {
  condition: PitchCondition
  times: number
  last_seen: string
}
