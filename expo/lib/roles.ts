// ── Role system types and helpers ─────────────────────────────────────────────

/** The five user roles in ShiftUp */
export type UserRole = 'player' | 'coach' | 'parent' | 'volunteer' | 'club_admin';

/** Every role request goes through admin approval (except player, the default) */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** A role assigned to a user within a specific club */
export type MemberRole = {
  role: UserRole;
  status: ApprovalStatus;
  granted_at: string | null;
};

/** A linked junior (child) under a parent */
export type LinkedJunior = {
  id: string;
  junior_id: string;
  full_name: string;
  date_of_birth: string | null;
  age_group: string | null;
  consent_given: boolean;
  consent_date: string | null;
  link_status: ApprovalStatus;
};

/** Age-gating rules for parent linking */
export type JuniorAgeCategory = 'under_16' | '16_to_17' | 'adult';

export function getJuniorAgeCategory(dateOfBirth: string | null): JuniorAgeCategory {
  if (!dateOfBirth) return 'under_16'; // default to most restrictive
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;

  if (age >= 18) return 'adult';
  if (age >= 16) return '16_to_17';
  return 'under_16';
}

/**
 * Whether parent linking is required for a junior to participate.
 * - Under 16: mandatory (cannot participate without approved linked parent)
 * - 16-17: optional (can join independently, parent may link)
 * - 18+: not applicable
 */
export function isParentLinkRequired(category: JuniorAgeCategory): 'mandatory' | 'optional' | 'none' {
  switch (category) {
    case 'under_16': return 'mandatory';
    case '16_to_17': return 'optional';
    case 'adult': return 'none';
  }
}

/** Items that require admin approval */
export type ApprovalRequest = {
  id: string;
  type: 'join_club' | 'role_request' | 'parent_role' | 'link_junior' | 'coach_verification' | 'volunteer_request';
  requester_name: string;
  requester_id: string;
  details: string;
  status: ApprovalStatus;
  created_at: string;
  /** Extra context — e.g. junior name for link_junior, ECB level for coach */
  metadata?: Record<string, unknown>;
};

/** Role display helpers */
export const ROLE_CONFIG: Record<UserRole, { label: string; color: string; dimColor: string; icon: string }> = {
  club_admin: { label: 'Admin',     color: '#60A5FA', dimColor: 'rgba(96,165,250,0.15)',  icon: '🛡️' },
  coach:      { label: 'Coach',     color: '#22C55E', dimColor: 'rgba(34,197,94,0.10)',   icon: '🏏' },
  parent:     { label: 'Parent',    color: '#F97316', dimColor: 'rgba(249,115,22,0.12)',  icon: '👪' },
  volunteer:  { label: 'Volunteer', color: '#EFC84A', dimColor: 'rgba(239,200,74,0.12)',  icon: '🤝' },
  player:     { label: 'Player',    color: '#E8EDF5', dimColor: 'rgba(232,237,245,0.08)', icon: '🏃' },
};

/** Check if user has a specific role (approved only) */
export function hasRole(roles: MemberRole[], role: UserRole): boolean {
  return roles.some((r) => r.role === role && r.status === 'approved');
}

/** Get all approved roles */
export function approvedRoles(roles: MemberRole[]): UserRole[] {
  return roles.filter((r) => r.status === 'approved').map((r) => r.role);
}

/** Get pending role requests */
export function pendingRoles(roles: MemberRole[]): UserRole[] {
  return roles.filter((r) => r.status === 'pending').map((r) => r.role);
}
