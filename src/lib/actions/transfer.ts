'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { TransferRequestStatus } from '@/lib/types/transfer';

const SEASON = new Date().getFullYear();

export async function getMyTransferRequests() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transfer_requests')
    .select('*, from_club:clubs!from_club_id(name), to_club:clubs!to_club_id(name)')
    .eq('player_user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data ?? [] };
}

export async function requestTransfer(fromClubId: string, toClubId: string, notes?: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from('transfer_requests').insert({
    from_club_id: fromClubId,
    to_club_id: toClubId,
    player_user_id: user.id,
    notes: notes ?? null,
    season: SEASON,
  });
  if (error) return { success: false as const, error: error.message };
  revalidatePath('/transfer-window');
  return { success: true as const };
}

export async function withdrawTransferRequest(requestId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from('transfer_requests')
    .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('player_user_id', user.id);
  if (error) return { success: false as const, error: error.message };
  revalidatePath('/transfer-window');
  return { success: true as const };
}

export async function adminGetTransferRequests(clubId: string) {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transfer_requests')
    .select('*, from_club:clubs!from_club_id(name), to_club:clubs!to_club_id(name)')
    .or(`from_club_id.eq.${clubId},to_club_id.eq.${clubId}`)
    .eq('season', SEASON)
    .order('created_at', { ascending: false });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data ?? [] };
}

export async function adminUpdateTransferStatus(
  requestId: string,
  status: TransferRequestStatus
) {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from('transfer_requests')
    .update({
      status,
      approved_by: status === 'approved' ? user.id : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);
  if (error) return { success: false as const, error: error.message };
  revalidatePath('/admin/club/transfer-window');
  return { success: true as const };
}

export async function expressInterest(
  listingId: string,
  clubId: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  void listingId; void clubId; void message;
  return { success: false, error: 'Transfer marketplace coming soon.' };
}

export async function applyToListing(
  listingId: string,
  coverNote: string,
): Promise<{ success: boolean; error?: string }> {
  void listingId; void coverNote;
  return { success: false, error: 'Transfer marketplace coming soon.' };
}
