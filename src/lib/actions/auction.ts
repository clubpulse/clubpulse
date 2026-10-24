'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { AuctionStatus } from '@/lib/types/auction';

// ── Player-facing ─────────────────────────────────────────────────────────────

export async function getClubAuctions(clubId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data ?? [] };
}

export async function getAuctionLots(auctionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('auction_lots')
    .select('*')
    .eq('auction_id', auctionId)
    .order('display_name', { ascending: true });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data ?? [] };
}

export async function placeBid(lotId: string, amount: number) {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('place_auction_bid', {
    p_lot_id: lotId,
    p_bid_amount: amount,
  });

  if (error) return { success: false as const, error: error.message };
  if (!data?.ok) return { success: false as const, error: data?.error ?? 'bid_failed', data };

  revalidatePath('/auction');
  return { success: true as const, data };
}

export async function getMyBids(auctionId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('auction_lots')
    .select('*')
    .eq('auction_id', auctionId)
    .eq('current_bidder', user.id)
    .order('current_bid', { ascending: false });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data ?? [] };
}

// ── Admin-facing ──────────────────────────────────────────────────────────────

export async function adminCreateAuction(data: {
  club_id: string;
  name: string;
  season?: number;
  bidding_opens_at?: string;
  bidding_closes_at?: string;
}) {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from('auctions').insert({
    ...data,
    created_by: user.id,
    status: 'draft',
    season: data.season ?? new Date().getFullYear(),
  });

  if (error) return { success: false as const, error: error.message };
  revalidatePath('/admin/club/auction');
  return { success: true as const };
}

export async function adminAddLot(
  auctionId: string,
  playerId: string,
  displayName: string,
  role: string | undefined,
  basePrice: number
) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from('auction_lots').insert({
    auction_id: auctionId,
    player_user_id: playerId,
    display_name: displayName,
    role: role || null,
    base_price: basePrice,
  });

  if (error) return { success: false as const, error: error.message };
  revalidatePath('/admin/club/auction');
  return { success: true as const };
}

export async function adminUpdateAuctionStatus(auctionId: string, status: AuctionStatus) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('auctions')
    .update({ status })
    .eq('id', auctionId);

  if (error) return { success: false as const, error: error.message };
  revalidatePath('/admin/club/auction');
  revalidatePath('/auction');
  return { success: true as const };
}

export async function getClubMembers(clubId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('club_members')
    .select('user_id')
    .eq('club_id', clubId);

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data ?? [] };
}

export async function getWalletBalance() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('creds_wallet')
    .select('flexi_balance')
    .eq('user_id', user.id)
    .single();

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, balance: data?.flexi_balance ?? 0 };
}
