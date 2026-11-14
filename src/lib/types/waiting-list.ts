export type WaitingListStatus = 'waiting' | 'approved' | 'declined' | 'withdrawn'

export interface WaitingListEntry {
  id: string
  club_id: string
  user_id?: string
  email: string
  full_name: string
  phone?: string
  cricket_background?: string
  position_in_queue: number
  status: WaitingListStatus
  waiting_creds_awarded: number
  joining_bonus_awarded: number
  applied_at: string
  resolved_at?: string
}

export interface JoinWaitlistInput {
  club_id: string
  email: string
  full_name: string
  phone?: string
  cricket_background?: string
}
