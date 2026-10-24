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
