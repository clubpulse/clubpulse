export type TravelMode = 'car' | 'train' | 'bus' | 'flight' | 'other'

export const TRAVEL_MODE_CONFIG: Record<TravelMode, { emoji: string; label: string }> = {
  car:    { emoji: '🚗', label: 'Car' },
  train:  { emoji: '🚂', label: 'Train' },
  bus:    { emoji: '🚌', label: 'Bus' },
  flight: { emoji: '✈️', label: 'Flight' },
  other:  { emoji: '🚶', label: 'Other' },
}

export function calculateTravelCreds(distanceMiles: number): number {
  return Math.min(50 + Math.floor(distanceMiles / 10) * 10, 300)
}

export interface TravelLog {
  id: string
  user_id: string
  club_id: string
  fixture_id?: string
  travel_date: string
  destination: string
  distance_miles?: number
  travel_mode: TravelMode
  creds_awarded: number
  is_tour: boolean
  notes?: string
}

export interface ClubTour {
  id: string
  club_id: string
  name: string
  destination: string
  start_date: string
  end_date: string
  description?: string
  base_creds_reward: number
  bonus_per_day: number
  is_active: boolean
  participant_count?: number
}

export interface TourParticipant {
  id: string
  tour_id: string
  user_id: string
  days_attended: number
  creds_awarded: number
  awarded_at?: string
}
