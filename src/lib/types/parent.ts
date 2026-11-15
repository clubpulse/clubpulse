// ── Parent & Safeguarding Types ─────────────────────────────────────────────

export interface ChildProfile {
  id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  medical_notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  photo_consent: boolean;
  data_consent: boolean;
  created_at: string;
  updated_at: string;
}

export type Relationship = 'parent' | 'guardian' | 'carer';

export interface ParentChildLink {
  id: string;
  parent_id: string;
  child_id: string;
  relationship: Relationship;
  is_primary: boolean;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

export type ConsentType =
  | 'photo_video'
  | 'data_processing'
  | 'medical_treatment'
  | 'travel'
  | 'social_media'
  | 'coaching_observation'
  | 'general_participation';

export const CONSENT_LABELS: Record<ConsentType, string> = {
  photo_video: 'Photos & Video',
  data_processing: 'Data Processing',
  medical_treatment: 'Emergency Medical Treatment',
  travel: 'Travel to Away Fixtures',
  social_media: 'Social Media Posts',
  coaching_observation: 'One-to-One Coaching',
  general_participation: 'General Participation',
};

export type ConsentAction = 'granted' | 'withdrawn';

export interface ConsentRecord {
  id: string;
  child_id: string;
  parent_id: string;
  consent_type: ConsentType;
  action: ConsentAction;
  notes: string | null;
  created_at: string;
}

export interface ActiveConsent {
  child_id: string;
  consent_type: ConsentType;
  action: ConsentAction;
  parent_id: string;
  created_at: string;
}

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'reported' | 'under_review' | 'escalated' | 'resolved' | 'closed';

export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  reported: 'Reported',
  under_review: 'Under Review',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

export type IncidentCategory =
  | 'welfare_concern'
  | 'bullying'
  | 'discrimination'
  | 'code_of_conduct'
  | 'injury'
  | 'other';

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  welfare_concern: 'Welfare Concern',
  bullying: 'Bullying',
  discrimination: 'Discrimination',
  code_of_conduct: 'Code of Conduct',
  injury: 'Injury',
  other: 'Other',
};

export interface SafeguardingIncident {
  id: string;
  club_id: string;
  child_id: string | null;
  reported_by: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: IncidentCategory;
  description: string;
  actions_taken: string | null;
  outcome: string | null;
  is_confidential: boolean;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SafeguardingNote {
  id: string;
  incident_id: string;
  author_id: string;
  note: string;
  is_internal: boolean;
  created_at: string;
}

export type DbsCheckType = 'basic' | 'standard' | 'enhanced' | 'enhanced_barred';

export const DBS_TYPE_LABELS: Record<DbsCheckType, string> = {
  basic: 'Basic',
  standard: 'Standard',
  enhanced: 'Enhanced',
  enhanced_barred: 'Enhanced + Barred List',
};

export interface DbsCheck {
  id: string;
  club_id: string;
  user_id: string;
  check_type: DbsCheckType;
  certificate_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: 'pending' | 'valid' | 'expired' | 'rejected';
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface ChildWithConsents extends ChildProfile {
  consents: ActiveConsent[];
  links: (ParentChildLink & { parent_name: string; parent_email: string })[];
}

export interface SafeguardingDashboard {
  open_incidents: number;
  critical_incidents: number;
  children_registered: number;
  pending_verifications: number;
  expiring_dbs: number;
  consent_coverage: number;  // percentage of children with all consents
}

/** Compute age from date of birth */
export function computeAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
