'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type { WaitingListEntry, JoinWaitlistInput } from '@/lib/types/waiting-list';

/** Public: join a club's waiting list (no auth required) */
export async function joinWaitlist(
  input: JoinWaitlistInput,
): Promise<ActionResult<{ position_in_queue: number }>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('waiting_list')
      .insert({
        club_id: input.club_id,
        email: input.email.trim().toLowerCase(),
        full_name: input.full_name.trim(),
        phone: input.phone?.trim() || null,
        cricket_background: input.cricket_background?.trim() || null,
      })
      .select('position_in_queue')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'You are already on this waiting list.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, data: { position_in_queue: data.position_in_queue } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Player: get own waiting list entry for a club */
export async function getMyWaitlistEntry(
  clubId: string,
): Promise<ActionResult<WaitingListEntry | null>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('waiting_list')
      .select('*')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, data: data as WaitingListEntry | null };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Admin: get all waiting list entries for a club sorted by queue position */
export async function getClubWaitlist(
  clubId: string,
): Promise<ActionResult<WaitingListEntry[]>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('waiting_list')
      .select('*')
      .eq('club_id', clubId)
      .order('position_in_queue', { ascending: true });

    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as WaitingListEntry[] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Admin: approve a waiting list entry (calls RPC which awards joining bonus) */
export async function approveEntry(
  entryId: string,
): Promise<ActionResult<{ joining_bonus: number }>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('approve_waiting_list_entry', {
      p_entry_id: entryId,
      p_joining_bonus: 500,
    });

    if (error) return { success: false, error: error.message };
    const result = data as { ok: boolean; error?: string; joining_bonus?: number };
    if (!result.ok) return { success: false, error: result.error ?? 'Approval failed' };
    return { success: true, data: { joining_bonus: result.joining_bonus ?? 500 } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Admin: decline a waiting list entry */
export async function declineEntry(entryId: string): Promise<ActionResult<void>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('waiting_list')
      .update({ status: 'declined', resolved_at: new Date().toISOString() })
      .eq('id', entryId);

    if (error) return { success: false, error: error.message };
    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Public: get club info by slug for the public join page */
export async function getClubBySlug(
  slug: string,
): Promise<ActionResult<{ id: string; name: string; slug: string }>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('clubs')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: false, error: 'Club not found' };
    return { success: true, data: data as { id: string; name: string; slug: string } };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/** Public: get waiting list count for a club (for the join page) */
export async function getWaitlistCount(
  clubId: string,
): Promise<ActionResult<number>> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from('waiting_list')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('status', 'waiting');

    if (error) return { success: false, error: error.message };
    return { success: true, data: count ?? 0 };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
