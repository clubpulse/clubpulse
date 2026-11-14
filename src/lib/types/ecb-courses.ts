export type CourseCategory = 'coaching'|'safeguarding'|'first_aid'|'officiating'|'other'

export const CATEGORY_CONFIG: Record<CourseCategory, { emoji: string; label: string; color: string }> = {
  coaching:     { emoji: '🏏', label: 'Coaching',     color: 'text-blue-600' },
  safeguarding: { emoji: '🛡️', label: 'Safeguarding', color: 'text-purple-600' },
  first_aid:    { emoji: '⛑️', label: 'First Aid',    color: 'text-red-600' },
  officiating:  { emoji: '⚖️', label: 'Officiating',  color: 'text-amber-600' },
  other:        { emoji: '📋', label: 'Other',         color: 'text-gray-600' },
}

export interface EcbCourseType {
  id: string
  name: string
  category: CourseCategory
  level?: number
  creds_reward: number
  validity_months?: number
  description?: string
  display_order: number
}

export interface MemberQualification {
  id: string
  user_id: string
  club_id: string
  course_type_id: string
  completed_date: string
  expires_date?: string
  certificate_number?: string
  is_verified: boolean
  verified_at?: string
  creds_awarded: number
  course?: EcbCourseType
  is_expired?: boolean  // computed: expires_date < today
}

export interface ClubQualificationSummary {
  user_id: string
  user_name: string
  qualifications: MemberQualification[]
  has_safeguarding: boolean
  has_first_aid: boolean
  coaching_level: number  // highest coaching level held
}
