export interface InfamyCategory {
  id: string
  club_id: string
  name: string
  description?: string
  emoji: string
  is_active: boolean
  created_at: string
}

export interface InfamyNomination {
  id: string
  category_id: string
  club_id: string
  nominated_user_id: string
  nominator_user_id: string
  reason: string
  season: number
  vote_count?: number  // computed from infamy_votes
  created_at: string
  category?: InfamyCategory
  nominated_profile?: { full_name: string; avatar_url?: string }
}

export interface InfamyWinner {
  id: string
  category_id: string
  club_id: string
  winner_user_id: string
  season: number
  vote_count: number
  locked_at: string
  category?: InfamyCategory
  winner_profile?: { full_name: string; avatar_url?: string }
}
