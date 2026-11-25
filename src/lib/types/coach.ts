// Coach management types

export type CertType =
  | 'dbs_basic'
  | 'dbs_enhanced'
  | 'ecb_level_1'
  | 'ecb_level_2'
  | 'ecb_level_3'
  | 'ecb_level_4'
  | 'first_aid'
  | 'safeguarding'
  | 'other';

export const CERT_LABELS: Record<CertType, string> = {
  dbs_basic: 'DBS Basic',
  dbs_enhanced: 'DBS Enhanced',
  ecb_level_1: 'ECB Level 1',
  ecb_level_2: 'ECB Level 2',
  ecb_level_3: 'ECB Level 3',
  ecb_level_4: 'ECB Level 4',
  first_aid: 'First Aid',
  safeguarding: 'Safeguarding',
  other: 'Other',
};

export interface CoachProfile {
  id: string;
  user_id: string;
  club_id: string;
  bio: string | null;
  specialisations: string[];
  experience_years: number;
  hourly_rate_scores: number;
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  is_visible: boolean;
  max_sessions_per_week: number;
  total_sessions: number;
  total_ratings: number;
  avg_rating: number | null;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  full_name?: string | null;
  display_name?: string | null;
}

export interface CoachAvailability {
  id: string;
  coach_id: string;
  day_of_week: number; // 0 = Sunday
  start_time: string;
  end_time: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CoachCertification {
  id: string;
  coach_id: string;
  cert_type: CertType;
  cert_name: string;
  issuing_body: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  certificate_ref: string | null;
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

export interface CoachSessionNote {
  id: string;
  booking_id: string;
  coach_id: string;
  player_id: string;
  notes: string;
  focus_areas: string[] | null;
  improvement: string | null;
  next_steps: string | null;
  created_at: string;
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function formatTimeSlot(slot: CoachAvailability): string {
  return `${DAY_LABELS[slot.day_of_week]} ${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`;
}
