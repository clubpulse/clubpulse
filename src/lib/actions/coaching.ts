'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { ActionResult } from '@/lib/types/action';
import type { CoachingListing, CoachingBooking } from '@/lib/types/coaching';

export async function getCoachingListings(clubId: string): Promise<ActionResult<CoachingListing[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('coaching_listings')
    .select('*, coach_profile:profiles(full_name)')
    .eq('club_id', clubId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as CoachingListing[] };
}

export async function createListing(data: {
  club_id: string;
  title: string;
  description?: string;
  coaching_type: string;
  session_format: string;
  duration_minutes: number;
  max_players: number;
  scores_cost: number;
  qualification?: string;
  location?: string;
}): Promise<ActionResult<CoachingListing>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: listing, error } = await supabase
    .from('coaching_listings')
    .insert({ ...data, coach_user_id: user.id })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: listing as CoachingListing };
}

export async function bookSession(
  listingId: string,
  date: string,
  time?: string
): Promise<ActionResult<{ scores_paid: number }>> {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('book_coaching_session', {
    p_listing_id: listingId,
    p_session_date: date,
    p_session_time: time ?? null,
  });

  if (error) return { success: false, error: error.message };
  if (!data?.ok) return { success: false, error: data?.error ?? 'Booking failed' };
  return { success: true, data: { scores_paid: data.scores_paid } };
}

export async function completeSession(
  bookingId: string,
  notes?: string
): Promise<ActionResult<{ coach_creds_earned: number }>> {
  await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('complete_coaching_session', {
    p_booking_id: bookingId,
    p_notes: notes ?? null,
  });

  if (error) return { success: false, error: error.message };
  if (!data?.ok) return { success: false, error: data?.error ?? 'Failed to complete session' };
  return { success: true, data: { coach_creds_earned: data.coach_creds_earned } };
}

export async function rateSession(
  bookingId: string,
  rating: number,
  feedback?: string
): Promise<ActionResult<void>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error: bookingError } = await supabase
    .from('coaching_bookings')
    .update({ player_rating: rating, player_feedback: feedback ?? null })
    .eq('id', bookingId)
    .eq('player_user_id', user.id)
    .eq('status', 'completed');

  if (bookingError) return { success: false, error: bookingError.message };

  const { data: booking } = await supabase
    .from('coaching_bookings')
    .select('listing_id')
    .eq('id', bookingId)
    .single();

  if (booking?.listing_id) {
    const { data: agg } = await supabase
      .from('coaching_bookings')
      .select('player_rating')
      .eq('listing_id', booking.listing_id)
      .not('player_rating', 'is', null);

    if (agg && agg.length > 0) {
      const avg = agg.reduce((s: number, r: { player_rating: number }) => s + r.player_rating, 0) / agg.length;
      await supabase
        .from('coaching_listings')
        .update({ avg_rating: Math.round(avg * 100) / 100 })
        .eq('id', booking.listing_id);
    }
  }

  return { success: true, data: undefined };
}

export async function getMyBookings(): Promise<ActionResult<CoachingBooking[]>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('coaching_bookings')
    .select('*, listing:coaching_listings(*)')
    .eq('player_user_id', user.id)
    .order('session_date', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as CoachingBooking[] };
}

export async function getMyCoachingRequests(): Promise<ActionResult<CoachingBooking[]>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('coaching_bookings')
    .select('*, listing:coaching_listings(*)')
    .eq('coach_user_id', user.id)
    .order('session_date', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as CoachingBooking[] };
}

export async function toggleListingActive(listingId: string): Promise<ActionResult<void>> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from('coaching_listings')
    .select('is_active')
    .eq('id', listingId)
    .eq('coach_user_id', user.id)
    .single();

  if (!listing) return { success: false, error: 'Listing not found' };

  const { error } = await supabase
    .from('coaching_listings')
    .update({ is_active: !listing.is_active })
    .eq('id', listingId)
    .eq('coach_user_id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function updateBookingStatus(
  bookingId: string,
  status: 'confirmed' | 'cancelled'
): Promise<ActionResult<void>> {
  const user = await requireUser();
  const supabase = await createClient();

  const update: Record<string, unknown> = { status };
  if (status === 'confirmed') update.confirmed_at = new Date().toISOString();

  const { error } = await supabase
    .from('coaching_bookings')
    .update(update)
    .eq('id', bookingId)
    .eq('coach_user_id', user.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}
