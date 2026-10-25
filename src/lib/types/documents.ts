export type DocumentCategory = 'constitution'|'safeguarding'|'code_of_conduct'|'ground_rules'|'minutes'|'finance'|'other'

export const CATEGORY_CONFIG: Record<DocumentCategory, { label: string; emoji: string }> = {
  constitution:    { label: 'Constitution',       emoji: '📜' },
  safeguarding:   { label: 'Safeguarding',        emoji: '🛡️' },
  code_of_conduct: { label: 'Code of Conduct',   emoji: '📋' },
  ground_rules:   { label: 'Ground Rules',        emoji: '🏟️' },
  minutes:        { label: 'Meeting Minutes',     emoji: '📝' },
  finance:        { label: 'Finance',             emoji: '💷' },
  other:          { label: 'Other',               emoji: '📄' },
}

export interface ClubDocument {
  id: string
  club_id: string
  title: string
  description?: string
  category: DocumentCategory
  file_url: string
  version?: string
  is_mandatory: boolean
  is_active: boolean
  created_at: string
}

export interface DocumentAcknowledgement {
  id: string
  document_id: string
  user_id: string
  acknowledged_at: string
}

export interface MandatoryDocWithAck extends ClubDocument {
  acknowledged_at: string | null
}

export interface AcknowledgementStatus {
  document_id: string
  total_members: number
  acked_count: number
  unacked_members: { user_id: string; display_name: string | null }[]
}
