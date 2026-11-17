import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { api } from '../lib/api';
import type { MemberRole, UserRole, ApprovalRequest, LinkedJunior } from '../lib/roles';
import { hasRole, approvedRoles } from '../lib/roles';

type ClubInfo = {
  id: string;
  name: string;
  subscription_tier: string | null;
  member_count: number;
};

type UseRolesReturn = {
  /** All role assignments for this user (approved + pending) */
  roles: MemberRole[];
  /** Only approved roles */
  active: UserRole[];
  /** Quick checks */
  isAdmin: boolean;
  isCoach: boolean;
  isParent: boolean;
  isVolunteer: boolean;
  isPlayer: boolean;
  /** The club this user belongs to */
  club: ClubInfo | null;
  /** Linked juniors (for parents) */
  juniors: LinkedJunior[];
  /** Pending approval requests (for admins) */
  approvalQueue: ApprovalRequest[];
  /** Loading state */
  loading: boolean;
  /** True when the last load failed; the roles shown may then be incomplete */
  error: boolean;
  /** Refresh all data */
  refresh: () => Promise<void>;
};

export function useRoles(): UseRolesReturn {
  const { user } = useAuth();
  const [roles, setRoles] = useState<MemberRole[]>([]);
  const [club, setClub] = useState<ClubInfo | null>(null);
  const [juniors, setJuniors] = useState<LinkedJunior[]>([]);
  const [approvalQueue, setApprovalQueue] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      // The server works out roles from user_roles and club_members; see /api/profile/roles
      const data = await api<{
        roles: MemberRole[];
        club: ClubInfo | null;
        juniors: LinkedJunior[];
        approvalQueue: ApprovalRequest[];
      }>('/api/profile/roles');
      setRoles(data.roles);
      setClub(data.club);
      setJuniors(data.juniors);
      setApprovalQueue(data.approvalQueue);
      setError(false);
    } catch {
      // Keep whatever was loaded before; on a first load that means player only.
      // The flag lets screens say so instead of silently hiding role sections.
      setRoles((current) => (current.length > 0 ? current : [{ role: 'player', status: 'approved', granted_at: null }]));
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const active = approvedRoles(roles);

  return {
    roles,
    active,
    isAdmin: hasRole(roles, 'club_admin'),
    isCoach: hasRole(roles, 'coach'),
    isParent: hasRole(roles, 'parent'),
    isVolunteer: hasRole(roles, 'volunteer'),
    isPlayer: hasRole(roles, 'player'),
    club,
    juniors,
    approvalQueue,
    loading,
    error,
    refresh: load,
  };
}
