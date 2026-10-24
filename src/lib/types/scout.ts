export interface ScoutSession {
  id: string
  club_id: string
  created_by: string
  session_name: string
  date_from: string
  date_to: string
  share_token: string
  is_active: boolean
  player_codes: Record<string, string>  // user_id -> "Player Alpha"
  created_at: string
}

export interface AnonymousPlayerStat {
  code: string          // "Player Alpha"
  matches: number
  runs?: number
  wickets?: number
  catches?: number
  availability_rate?: number
}
