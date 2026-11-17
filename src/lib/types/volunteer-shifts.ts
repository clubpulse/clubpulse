// ── Volunteer Shift Scheduling Types ─────────────────────────────────────────

export type ShiftRole =
  | 'scorer'
  | 'umpire'
  | 'groundskeeper'
  | 'tea_duty'
  | 'first_aid'
  | 'general';

export const SHIFT_ROLE_LABELS: Record<ShiftRole, string> = {
  scorer: 'Scorer',
  umpire: 'Umpire',
  groundskeeper: 'Groundskeeper',
  tea_duty: 'Tea Duty',
  first_aid: 'First Aid',
  general: 'General',
};

export type SignupStatus =
  | 'signed_up'
  | 'confirmed'
  | 'checked_in'
  | 'completed'
  | 'no_show'
  | 'cancelled';

export const SIGNUP_STATUS_LABELS: Record<SignupStatus, string> = {
  signed_up: 'Signed Up',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  completed: 'Completed',
  no_show: 'No Show',
  cancelled: 'Cancelled',
};

export interface VolunteerShift {
  id: string;
  club_id: string;
  title: string;
  description: string | null;
  role: ShiftRole;
  shift_date: string;        // DATE as ISO string
  start_time: string;         // TIME as HH:MM:SS
  end_time: string;
  location: string | null;
  max_volunteers: number;
  scores_bonus: number;
  is_critical: boolean;
  created_by: string;
  created_at: string;
}

export interface ShiftSignup {
  id: string;
  shift_id: string;
  user_id: string;
  status: SignupStatus;
  check_in_at: string | null;
  check_out_at: string | null;
  hours_logged: number | null;
  scores_earned: number;
  notes: string | null;
  signed_up_at: string;
}

export interface ShiftWithSignups extends VolunteerShift {
  signups: (ShiftSignup & { user_name: string; user_email: string })[];
  signup_count: number;
  spots_remaining: number;
}

export interface VolunteerHoursSummary {
  user_id: string;
  club_id: string;
  total_hours: number;
  total_shifts: number;
  total_scores: number;
  no_show_count: number;
  last_shift_date: string | null;
  updated_at: string;
}

export interface VolunteerWithHours {
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  total_hours: number;
  total_shifts: number;
  total_scores: number;
  no_show_count: number;
  last_shift_date: string | null;
}

export interface VolunteerAnalytics {
  total_volunteers: number;
  active_this_month: number;
  total_hours_this_month: number;
  total_scores_awarded: number;
  upcoming_shifts: number;
  unfilled_spots: number;
  no_show_rate: number;
}

/** Format time string "HH:MM:SS" → "HH:MM" */
export function formatTime(t: string): string {
  return t.slice(0, 5);
}

/** Compute shift duration in hours */
export function shiftDurationHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}
