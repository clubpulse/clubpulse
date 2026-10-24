export type RaffleStatus = 'active' | 'drawn' | 'cancelled'

export interface Raffle {
  id: string
  club_id: string
  title: string
  description?: string
  prize_description: string
  ticket_cost_scores: number
  max_tickets_per_player: number
  total_tickets_available?: number
  winner_count: number
  status: RaffleStatus
  draw_date?: string
  drawn_at?: string
  created_at: string
  my_ticket_count?: number
  total_ticket_count?: number
}

export interface RaffleTicket {
  id: string
  raffle_id: string
  user_id: string
  ticket_number: number
  scores_spent: number
  purchased_at: string
  is_winner: boolean
}

export interface RaffleWinner {
  id: string
  raffle_id: string
  user_id: string
  ticket_id: string
  prize_rank: number
  claimed_at?: string
  profile?: { full_name: string }
}
