export interface ClubCharity {
  id: string
  club_id: string
  name: string
  description?: string
  logo_url?: string
  charity_number?: string
  website_url?: string
  is_active: boolean
  total_scores_donated: number
  total_donated_pence: number
}

export interface CharityDonation {
  id: string
  user_id: string
  charity_id: string
  scores_donated: number
  pence_value: number
  donated_at: string
  message?: string
  charity?: ClubCharity
}

export interface CharitySettings {
  scores_per_pound: number
  is_enabled: boolean
}

export interface CharityDonationBatch {
  id: string
  charity_id: string
  total_scores: number
  total_pence: number
  processed_at: string
  transaction_reference?: string
}
