export interface ClubHealthMetrics {
  total_members: number
  total_scores: number
  dressing_room_posts_30d: number
  fixtures_90d: number
  active_injuries: number
  availability_rate: number
}

export interface ClubHealthSnapshot {
  id: string
  club_id: string
  snapshot_month: string
  total_members: number
  active_members: number
  avg_availability_rate: number
  total_scores_earned: number
  total_scores_spent: number
  dressing_room_posts: number
  fixtures_played: number
  active_injuries_anonymous: number
  mentor_sessions_count: number
  created_at: string
}

export interface HealthScore {
  label: string
  value: number | string
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  status: 'good' | 'warning' | 'critical' | 'info'
}
