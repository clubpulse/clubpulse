export type AuctionStatus = 'draft'|'open'|'closed'|'settled'
export type LotStatus = 'available'|'sold'|'unsold'

export interface Auction {
  id: string
  club_id: string
  name: string
  season: number
  status: AuctionStatus
  bidding_opens_at?: string
  bidding_closes_at?: string
}

export interface AuctionLot {
  id: string
  auction_id: string
  player_user_id: string
  display_name: string
  role?: string
  base_price: number
  current_bid?: number
  current_bidder?: string
  status: LotStatus
}

export interface AuctionBid {
  id: string
  lot_id: string
  bidder_user_id: string
  bid_amount: number
  placed_at: string
}
