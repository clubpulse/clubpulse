export interface ClubFeeSettings {
  id: string
  club_id: string
  annual_fee_pence: number
  scores_per_pound: number
  max_offset_percent: number
  is_active: boolean
  updated_at: string
}

export interface FeeOffsetApplication {
  id: string
  user_id: string
  club_id: string
  season: number
  scores_applied: number
  pence_offset: number
  status: 'pending' | 'approved' | 'rejected'
  applied_at: string
  resolved_at?: string
  admin_notes?: string
}

export interface FeeOffsetSummary {
  settings: ClubFeeSettings
  myApplication?: FeeOffsetApplication
  myBalance: number
  maxScoresAllowed: number
  maxPoundsOffset: number
}
