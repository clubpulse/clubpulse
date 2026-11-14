'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type { InjuryLog, InjuryAggregate, LogInjuryInput } from '@/lib/types/injury';

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function logInjury(input: LogInjuryInput): Promise<ActionResult<InjuryLog>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('injury_logs')
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as InjuryLog };
}

export async function markRecovered(injuryId: string): Promise<ActionResult<InjuryLog>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('injury_logs')
    .update({ is_active: false, actual_return: today })
    .eq('id', injuryId)
    .eq('user_id', userId) // RLS enforces this too, but be explicit
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as InjuryLog };
}

export async function getMyInjuries(userId: string): Promise<ActionResult<{ active: InjuryLog[]; past: InjuryLog[] }>> {
  const callerId = await currentUserId();
  if (!callerId || callerId !== userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('injury_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { success: false, error: error.message };

  const logs = data as InjuryLog[];
  return {
    success: true,
    data: {
      active: logs.filter((l) => l.is_active),
      past: logs.filter((l) => !l.is_active),
    },
  };
}

export async function getClubInjuryAggregate(clubId: string): Promise<ActionResult<InjuryAggregate[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_club_injury_aggregate', { p_club_id: clubId });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as InjuryAggregate[] };
}

export async function updateInjury(
  injuryId: string,
  updates: Partial<Pick<InjuryLog, 'expected_return' | 'description' | 'severity'>>
): Promise<ActionResult<InjuryLog>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('injury_logs')
    .update(updates)
    .eq('id', injuryId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as InjuryLog };
}
