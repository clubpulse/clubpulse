export type TransferRequestStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn'

export interface TransferRequest {
  id: string
  from_club_id: string
  to_club_id: string
  player_user_id: string
  status: TransferRequestStatus
  season: number
  approved_by?: string
  notes?: string
  created_at: string
  updated_at: string
  from_club?: { name: string }
  to_club?: { name: string }
}

export interface TransferAvailable {
  id: string;
  position: string;
  level: string;
  description?: string | null;
  club?: { name: string } | null;
}

export interface TransferWanted {
  id: string;
  position: string;
  level_required: string;
  age_range?: string | null;
  description?: string | null;
  applications_count: number;
  club?: { name: string } | null;
}
