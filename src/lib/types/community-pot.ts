export type ProposalStatus = 'voting'|'approved'|'rejected'|'funded'|'cancelled'

export interface CommunityPot {
  club_id: string
  total_scores: number
  total_contributors: number
  updated_at: string
}

export interface PotProposal {
  id: string
  club_id: string
  title: string
  description: string
  scores_requested: number
  status: ProposalStatus
  votes_for: number
  votes_against: number
  voting_ends_at: string
  funded_at?: string
  my_vote?: 'for'|'against'|null
}

export interface PotContribution {
  id: string
  user_id: string
  scores_contributed: number
  contributed_at: string
}
