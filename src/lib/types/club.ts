export type Club = {
  id:         string;
  name:       string;
  sport:      string;
  ground_lat: number | null;
  ground_lng: number | null;
  created_at: string;
};

export type ClubMemberRole = 'member' | 'admin' | 'coach' | 'volunteer';

export type ClubMember = {
  id:        string;
  club_id:   string;
  user_id:   string;
  role:      ClubMemberRole;
  joined_at: string;
  is_active: boolean;
};

export type ClubAdmin = ClubMember & { role: 'admin' };

// Member row plus the only profile fields a club admin is allowed to see
export type ClubMemberWithProfile = ClubMember & {
  full_name:    string | null;
  display_name: string | null;
};
