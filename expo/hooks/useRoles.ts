import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
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

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      // 1) Get user's club membership and roles
      const { data: memberships } = await supabase
        .from('club_members')
        .select('user_role, status, granted_at, club_id, clubs ( id, name, subscription_tier )')
        .eq('user_id', user.id);

      if (!memberships || memberships.length === 0) {
        setRoles([{ role: 'player', status: 'approved', granted_at: null }]);
        setClub(null);
        setLoading(false);
        return;
      }

      // Build roles from all membership rows (user can have multiple role rows)
      const memberRoles: MemberRole[] = memberships.map((m: any) => ({
        role: m.user_role ?? 'player',
        status: m.status ?? 'approved',
        granted_at: m.granted_at,
      }));

      // Always ensure player is in the list
      if (!memberRoles.some((r) => r.role === 'player')) {
        memberRoles.push({ role: 'player', status: 'approved', granted_at: null });
      }

      setRoles(memberRoles);

      // Get club info from first membership
      const firstClub = memberships[0]?.clubs;
      const clubData = Array.isArray(firstClub) ? firstClub[0] : firstClub;
      const clubId = memberships[0]?.club_id;

      if (clubData && clubId) {
        const { count } = await supabase
          .from('club_members')
          .select('id', { count: 'exact', head: true })
          .eq('club_id', clubId);

        setClub({
          id: clubData.id,
          name: clubData.name,
          subscription_tier: clubData.subscription_tier,
          member_count: count ?? 0,
        });

        // 2) If parent, load linked juniors
        if (memberRoles.some((r) => r.role === 'parent' && r.status === 'approved')) {
          const { data: juniorRows } = await supabase
            .from('linked_juniors')
            .select('id, junior_id, full_name, date_of_birth, age_group, consent_given, consent_date, link_status')
            .eq('parent_id', user.id)
            .order('full_name');

          setJuniors(
            (juniorRows ?? []).map((j: any) => ({
              id: j.id,
              junior_id: j.junior_id ?? j.id,
              full_name: j.full_name,
              date_of_birth: j.date_of_birth,
              age_group: j.age_group,
              consent_given: j.consent_given ?? false,
              consent_date: j.consent_date,
              link_status: j.link_status ?? 'approved',
            }))
          );
        }

        // 3) If admin, load pending approval queue
        if (memberRoles.some((r) => r.role === 'club_admin' && r.status === 'approved')) {
          const { data: pendingRows } = await supabase
            .from('approval_requests')
            .select('*')
            .eq('club_id', clubId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(50);

          setApprovalQueue(
            (pendingRows ?? []).map((r: any) => ({
              id: r.id,
              type: r.type,
              requester_name: r.requester_name ?? 'Unknown',
              requester_id: r.requester_id,
              details: r.details ?? '',
              status: r.status,
              created_at: r.created_at,
              metadata: r.metadata,
            }))
          );
        }
      }
    } catch {
      // Fail gracefully — default to player
      setRoles([{ role: 'player', status: 'approved', granted_at: null }]);
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
    refresh: load,
  };
}
