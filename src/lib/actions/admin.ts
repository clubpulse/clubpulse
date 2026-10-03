'use server';

import { createClient } from '@/lib/supabase/server';
import {
  createMultiplier,
  endMultiplier,
  listClubMembers,
  listVolunteerSessions,
  type MultiplierInput,
} from '@/lib/admin/service';
import { approveVolunteerSession } from '@/lib/volunteer/approve';
import type { DynamicMultiplier } from '@/lib/ai/dynamic-creds';
import type { ActionResult } from '@/lib/types/action';
import type { ClubMemberWithProfile } from '@/lib/types/club';
import type { VolunteerSessionWithName, VolunteerStatus } from '@/lib/types/volunteer';

// Server actions are public endpoints: each one resolves the caller from the session and
// the service layer re-checks club-admin rights before touching anything.
async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getClubMembers(clubId: string): Promise<ActionResult<ClubMemberWithProfile[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };
  return listClubMembers(userId, clubId);
}

export async function getVolunteerSessions(
  clubId: string,
  status?: VolunteerStatus
): Promise<ActionResult<VolunteerSessionWithName[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };
  return listVolunteerSessions(userId, clubId, status);
}

export async function approveVolunteer(sessionId: string): Promise<ActionResult<{ credsAwarded: number }>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };
  return approveVolunteerSession(userId, sessionId);
}

export async function setMultiplier(
  clubId: string,
  input: MultiplierInput
): Promise<ActionResult<DynamicMultiplier>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };
  return createMultiplier(userId, clubId, input);
}

export async function stopMultiplier(multiplierId: string): Promise<ActionResult<null>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };
  return endMultiplier(userId, multiplierId);
}
