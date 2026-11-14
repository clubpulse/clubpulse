export type BodyPart = 'head'|'shoulder'|'elbow'|'wrist'|'hand'|'back'|'hip'|'knee'|'ankle'|'hamstring'|'other'
export type InjurySeverity = 'minor' | 'moderate' | 'serious'

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  head: 'Head', shoulder: 'Shoulder', elbow: 'Elbow', wrist: 'Wrist',
  hand: 'Hand', back: 'Back', hip: 'Hip', knee: 'Knee', ankle: 'Ankle',
  hamstring: 'Hamstring', other: 'Other'
}

export const SEVERITY_CONFIG: Record<InjurySeverity, { label: string; color: string; emoji: string }> = {
  minor:    { label: 'Minor',    color: 'text-yellow-500', emoji: '🟡' },
  moderate: { label: 'Moderate', color: 'text-orange-500', emoji: '🟠' },
  serious:  { label: 'Serious',  color: 'text-red-500',    emoji: '🔴' },
}

export interface InjuryLog {
  id: string
  user_id: string
  club_id: string
  body_part: BodyPart
  severity: InjurySeverity
  description?: string
  injured_at: string
  expected_return?: string
  actual_return?: string
  is_active: boolean
  created_at: string
}

export interface InjuryAggregate {
  body_part: BodyPart
  severity: InjurySeverity
  affected_count: number
  avg_days_out: number
}

export interface LogInjuryInput {
  club_id: string
  body_part: BodyPart
  severity: InjurySeverity
  description?: string
  injured_at: string
  expected_return?: string
}
