export type NoticePriority = 'urgent' | 'normal' | 'info'

export const PRIORITY_CONFIG: Record<NoticePriority, { label: string; color: string; bg: string; emoji: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-700',  bg: 'bg-red-50',  emoji: '🚨' },
  normal: { label: 'Notice', color: 'text-gray-700', bg: 'bg-white',   emoji: '📌' },
  info:   { label: 'Info',   color: 'text-blue-700', bg: 'bg-blue-50', emoji: 'ℹ️' },
}

export interface Notice {
  id: string
  club_id: string
  title: string
  body: string
  priority: NoticePriority
  is_pinned: boolean
  expires_at?: string
  created_at: string
}
