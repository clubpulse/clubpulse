'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { ActionResult } from '@/lib/types/action';
import type { ClubCharity, CharityDonation, CharitySettings, CharityDonationBatch } from '@/lib/types/charity';

export async function getClubCharities(clubId: string): Promise<ActionResult<ClubCharity[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  const { data, error } = await supabase
    .from('club_charities').select('*').eq('club_id', clubId).eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function getAllClubCharities(clubId: string): Promise<ActionResult<ClubCharity[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  const { data, error } = await supabase
    .from('club_charities').select('*').eq('club_id', clubId).order('created_at', { ascending: true });
  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function getMyDonations(clubId: string): Promise<ActionResult<CharityDonation[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  const { data, error } = await supabase
    .from('charity_donations')
    .select('*, charity:club_charities(id, name, description)')
    .eq('club_id', clubId).eq('user_id', user.id).order('donated_at', { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as CharityDonation[] };
}

export async function getCharitySettings(clubId: string): Promise<ActionResult<CharitySettings>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  const { data, error } = await supabase
    .from('charity_settings').select('scores_per_pound, is_enabled').eq('club_id', clubId).maybeSingle();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? { scores_per_pound: 1000, is_enabled: true } };
}

export async function donateToCharity(
  charityId: string, scores: number, message?: string
): Promise<ActionResult<{ scores_donated: number; pence_value: number; pounds: number }>> {
  const supabase = await createClient();
  await requireUser();
  const { data, error } = await supabase.rpc('donate_to_charity', {
    p_charity_id: charityId, p_scores: scores, p_message: message ?? null,
  });
  if (error) return { success: false, error: error.message };
  if (!data.ok) {
    const msgs: Record<string, string> = {
      charity_not_found: 'Charity not found or inactive.',
      donations_disabled: 'Donations are currently disabled for this club.',
      minimum_100_scores: 'Minimum donation is 100 Scores.',
      insufficient_scores: `Insufficient Scores. Your balance: ${data.balance ?? 0}`,
    };
    return { success: false, error: msgs[data.error] ?? data.error };
  }
  return { success: true, data: { scores_donated: data.scores_donated, pence_value: data.pence_value, pounds: Number(data.pounds) } };
}

export async function adminAddCharity(
  clubId: string,
  charityData: { name: string; description?: string; charity_number?: string; website_url?: string; logo_url?: string }
): Promise<ActionResult<ClubCharity>> {
  const supabase = await createClient();
  await requireUser();
  const { data, error } = await supabase
    .from('club_charities').insert({ club_id: clubId, ...charityData }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function adminToggleCharity(charityId: string, isActive: boolean): Promise<ActionResult<void>> {
  const supabase = await createClient();
  await requireUser();
  const { error } = await supabase.from('club_charities').update({ is_active: isActive }).eq('id', charityId);
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function adminUpdateCharitySettings(
  clubId: string, settings: { scores_per_pound: number; is_enabled: boolean }
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  await requireUser();
  const { error } = await supabase
    .from('charity_settings')
    .upsert({ club_id: clubId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'club_id' });
  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export interface PendingDonationGroup {
  charity: ClubCharity;
  total_scores: number;
  total_pence: number;
  donation_count: number;
}

export async function adminGetPendingDonations(clubId: string): Promise<ActionResult<PendingDonationGroup[]>> {
  const supabase = await createClient();
  await requireUser();
  const { data, error } = await supabase
    .from('charity_donations')
    .select('charity_id, scores_donated, pence_value, club_charities(id, name, description, charity_number, is_active, total_scores_donated, total_donated_pence, club_id, created_at)')
    .eq('club_id', clubId).is('batch_id', null);
  if (error) return { success: false, error: error.message };
  const grouped = new Map<string, PendingDonationGroup>();
  for (const row of data ?? []) {
    const charity = row.club_charities as unknown as ClubCharity;
    if (!charity) continue;
    const existing = grouped.get(row.charity_id);
    if (existing) {
      existing.total_scores += row.scores_donated;
      existing.total_pence += row.pence_value;
      existing.donation_count += 1;
    } else {
      grouped.set(row.charity_id, { charity, total_scores: row.scores_donated, total_pence: row.pence_value, donation_count: 1 });
    }
  }
  return { success: true, data: Array.from(grouped.values()) };
}

export async function adminProcessDonationBatch(
  clubId: string, charityId: string, reference: string, notes?: string
): Promise<ActionResult<CharityDonationBatch>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  const { data: donations, error: fetchErr } = await supabase
    .from('charity_donations').select('id, scores_donated, pence_value')
    .eq('club_id', clubId).eq('charity_id', charityId).is('batch_id', null);
  if (fetchErr) return { success: false, error: fetchErr.message };
  if (!donations || donations.length === 0) return { success: false, error: 'No pending donations for this charity.' };
  const totalScores = donations.reduce((s, d) => s + d.scores_donated, 0);
  const totalPence = donations.reduce((s, d) => s + d.pence_value, 0);
  const { data: batch, error: batchErr } = await supabase
    .from('charity_donation_batches')
    .insert({ club_id: clubId, charity_id: charityId, total_scores: totalScores, total_pence: totalPence, processed_by: user.id, transaction_reference: reference, notes: notes ?? null })
    .select().single();
  if (batchErr) return { success: false, error: batchErr.message };
  const { error: markErr } = await supabase
    .from('charity_donations').update({ batch_id: batch.id }).in('id', donations.map(d => d.id));
  if (markErr) return { success: false, error: markErr.message };
  return { success: true, data: batch as CharityDonationBatch };
}

export async function adminGetDonationBatches(clubId: string): Promise<ActionResult<CharityDonationBatch[]>> {
  const supabase = await createClient();
  await requireUser();
  const { data, error } = await supabase
    .from('charity_donation_batches').select('*').eq('club_id', clubId).order('processed_at', { ascending: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}
