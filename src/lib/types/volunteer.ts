export type VolunteerStatus = 'pending' | 'approved' | 'rejected';

// Keys of earning_rules.volunteering in the cricket sport config
export const VOLUNTEER_ROLES = ['scorer', 'umpire', 'groundskeeper', 'tea_duty', 'first_aid'] as const;
export type VolunteerRole = (typeof VOLUNTEER_ROLES)[number];

export const GPS_RADIUS_METRES = 500;

export type VolunteerSession = {
  id:             string;
  user_id:        string;
  club_id:        string;
  role:           string;
  session_date:   string;
  gps_lat:        number | null;
  gps_lng:        number | null;
  gps_confirmed:  boolean;
  club_confirmed: boolean;
  creds_awarded:  number;
  status:         VolunteerStatus;
  created_at:     string;
};

export type VolunteerSessionWithName = VolunteerSession & {
  volunteer_name: string | null;
};
