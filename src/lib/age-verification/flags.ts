import { createAdminClient } from '@/lib/supabase/admin';
import { hasCurrentDbsAt } from '@/lib/admin/child-link';
import { ageVerificationEnabled } from './flag';

export type OpenFlag = { id: string; userId: string; ageGroup: string; reason: string; createdAt: string };

/** Open squad flags for a DBS-checked welfare officer. The rows do not include a date of birth. */
export async function listOpenSquadFlags(officerId: string, clubId: string): Promise<{ items: OpenFlag[]; error?: string }> {
  if (!ageVerificationEnabled()) return { items: [] };
  const admin = createAdminClient();
  const { data: role } = await admin.from('club_members').select('id').eq('user_id', officerId).eq('club_id', clubId).eq('role', 'welfare_officer').eq('is_active', true).limit(1);
  if (!role || role.length === 0) return { items: [], error: 'Only a welfare officer can review squad flags.' };
  if (!(await hasCurrentDbsAt(officerId, clubId))) return { items: [], error: 'You need a current enhanced DBS check at this club.' };
  const { data, error } = await admin.from('age_squad_mismatches').select('id, user_id, age_group, reason, created_at')
    .eq('club_id', clubId).is('resolved_at', null).order('created_at', { ascending: false }).limit(50);
  if (error) return { items: [], error: 'Could not load squad flags.' };
  return {
    items: (data ?? []).map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      ageGroup: row.age_group as string,
      reason: row.reason as string,
      createdAt: row.created_at as string,
    })),
  };
}

export async function resolveSquadFlag(officerId: string, clubId: string, flagId: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!ageVerificationEnabled()) return { success: false, error: 'Squad flags are not open yet.' };
  const admin = createAdminClient();
  const { data: role } = await admin.from('club_members').select('id').eq('user_id', officerId).eq('club_id', clubId).eq('role', 'welfare_officer').eq('is_active', true).limit(1);
  if (!role || role.length === 0) return { success: false, error: 'Only a welfare officer can resolve a squad flag.' };
  if (!(await hasCurrentDbsAt(officerId, clubId))) return { success: false, error: 'You need a current enhanced DBS check at this club.' };
  const { data, error } = await admin.from('age_squad_mismatches').update({
    resolved_at: new Date().toISOString(),
    resolved_by: officerId,
  }).eq('id', flagId).eq('club_id', clubId).is('resolved_at', null).select('id');
  if (error || !data || data.length === 0) return { success: false, error: 'Could not resolve that flag.' };
  return { success: true };
}
