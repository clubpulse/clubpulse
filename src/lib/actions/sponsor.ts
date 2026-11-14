'use server';

// PRIVACY: junior_slots contains no PII. The admin_user_id mapping to the real child
// is managed offline by the club admin, not stored in this table.

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { ActionResult } from '@/lib/types/action';
import type { SponsorshipPackage, JuniorSlot, Sponsorship } from '@/lib/types/sponsor';

export async function getSponsorshipPackages(clubId: string): Promise<ActionResult<SponsorshipPackage[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('sponsorship_packages')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('scores_cost', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function getJuniorSlots(clubId: string): Promise<ActionResult<JuniorSlot[]>> {
  // PRIVACY: Only anonymous_label, age_group, and about are returned — no PII.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('junior_slots')
    .select('id, anonymous_label, age_group, about, is_available')
    .eq('club_id', clubId)
    .eq('is_available', true)
    .order('created_at', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function createSponsorship(
  packageId: string,
  juniorSlotId?: string,
  message?: string
): Promise<ActionResult<{ scores_paid: number }>> {
  const supabase = await createClient();
  await requireUser();

  const { data, error } = await supabase.rpc('create_sponsorship', {
    p_package_id: packageId,
    p_junior_slot_id: juniorSlotId ?? null,
    p_message: message ?? null,
  });

  if (error) return { success: false, error: error.message };
  if (!data.ok) {
    const msgs: Record<string, string> = {
      package_not_found: 'This sponsorship package is no longer available.',
      no_slots_available: 'All slots for this package have been filled.',
      insufficient_scores: `Not enough Scores. You need ${data.cost ?? 0}, you have ${data.balance ?? 0}.`,
    };
    return { success: false, error: msgs[data.error] ?? data.error };
  }

  return { success: true, data: { scores_paid: data.scores_paid } };
}

export async function getMySponsorships(clubId: string): Promise<ActionResult<Sponsorship[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('sponsorships')
    .select('*, package:sponsorship_packages(id, title, benefit_type, scores_cost, description), junior_slot:junior_slots(id, anonymous_label, age_group)')
    .eq('club_id', clubId)
    .eq('sponsor_user_id', user.id)
    .order('sponsored_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Sponsorship[] };
}

export async function adminCreatePackage(
  clubId: string,
  packageData: {
    title: string;
    description?: string;
    benefit_type: string;
    scores_cost: number;
    slots_available?: number;
  }
): Promise<ActionResult<SponsorshipPackage>> {
  const supabase = await createClient();
  await requireUser();

  const { data, error } = await supabase
    .from('sponsorship_packages')
    .insert({ club_id: clubId, ...packageData })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function adminTogglePackage(packageId: string, isActive: boolean): Promise<ActionResult<void>> {
  const supabase = await createClient();
  await requireUser();

  const { error } = await supabase
    .from('sponsorship_packages')
    .update({ is_active: isActive })
    .eq('id', packageId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function adminAddJuniorSlot(
  clubId: string,
  slotData: {
    anonymous_label: string;
    age_group: string;
    about?: string;
  }
): Promise<ActionResult<JuniorSlot>> {
  // PRIVACY: Only anonymous label, age group, and a non-identifying 'about' blurb are stored.
  // The real child's identity is held by the admin offline — never stored here.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('junior_slots')
    .insert({ club_id: clubId, admin_user_id: user.id, ...slotData })
    .select('id, anonymous_label, age_group, about, is_available')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function adminFulfillSponsorship(sponsorshipId: string): Promise<ActionResult<void>> {
  const supabase = await createClient();
  await requireUser();

  const { error } = await supabase
    .from('sponsorships')
    .update({ status: 'fulfilled', fulfilled_at: new Date().toISOString() })
    .eq('id', sponsorshipId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function adminGetSponsorships(clubId: string): Promise<ActionResult<Sponsorship[]>> {
  const supabase = await createClient();
  await requireUser();

  const { data, error } = await supabase
    .from('sponsorships')
    .select('*, package:sponsorship_packages(id, title, benefit_type, scores_cost), junior_slot:junior_slots(id, anonymous_label, age_group)')
    .eq('club_id', clubId)
    .order('sponsored_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Sponsorship[] };
}

export async function adminGetAllPackages(clubId: string): Promise<ActionResult<SponsorshipPackage[]>> {
  const supabase = await createClient();
  await requireUser();

  const { data, error } = await supabase
    .from('sponsorship_packages')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function adminGetAllJuniorSlots(clubId: string): Promise<ActionResult<JuniorSlot[]>> {
  const supabase = await createClient();
  await requireUser();

  const { data, error } = await supabase
    .from('junior_slots')
    .select('id, anonymous_label, age_group, about, is_available')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}
