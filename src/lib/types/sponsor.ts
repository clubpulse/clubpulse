export type BenefitType = 'membership'|'kit'|'coaching'|'equipment'|'other'
export type AgeGroup = 'under_9'|'under_11'|'under_13'|'under_15'|'under_17'|'under_19'

export const BENEFIT_TYPE_CONFIG: Record<BenefitType, { emoji: string; label: string }> = {
  membership: { emoji: '🎫', label: 'Club Membership' },
  kit:        { emoji: '🏏', label: 'Cricket Kit' },
  coaching:   { emoji: '🎓', label: 'Coaching Sessions' },
  equipment:  { emoji: '⚾', label: 'Equipment' },
  other:      { emoji: '💝', label: 'Other Support' },
}

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  under_9:  'Under 9',
  under_11: 'Under 11',
  under_13: 'Under 13',
  under_15: 'Under 15',
  under_17: 'Under 17',
  under_19: 'Under 19',
}

export interface SponsorshipPackage {
  id: string
  club_id: string
  title: string
  description?: string
  benefit_type: BenefitType
  scores_cost: number
  slots_available?: number
  slots_filled: number
  is_active: boolean
}

export interface JuniorSlot {
  id: string
  anonymous_label: string
  age_group: AgeGroup
  about?: string
  is_available: boolean
}

export interface Sponsorship {
  id: string
  sponsor_user_id: string
  package_id: string
  junior_slot_id?: string
  scores_paid: number
  status: 'active'|'fulfilled'|'cancelled'
  message?: string
  sponsored_at: string
  fulfilled_at?: string
  package?: SponsorshipPackage
  junior_slot?: JuniorSlot
}
