'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { ActionResult } from '@/lib/types/action';
import type { Raffle, RaffleTicket, RaffleWinner } from '@/lib/types/raffle';

export async function getActiveRaffles(clubId: string): Promise<ActionResult<Raffle[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: raffles, error } = await supabase
    .from('raffles')
    .select('*')
    .eq('club_id', clubId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };

  const enriched: Raffle[] = await Promise.all(
    (raffles ?? []).map(async (r) => {
      const [{ count: myCount }, { count: totalCount }] = await Promise.all([
        supabase.from('raffle_tickets').select('*', { count: 'exact', head: true })
          .eq('raffle_id', r.id).eq('user_id', user.id).then(res => ({ count: res.count ?? 0 })),
        supabase.from('raffle_tickets').select('*', { count: 'exact', head: true })
          .eq('raffle_id', r.id).then(res => ({ count: res.count ?? 0 })),
      ]);
      return { ...r, my_ticket_count: myCount, total_ticket_count: totalCount };
    })
  );

  return { success: true, data: enriched };
}

export async function getPastRaffles(clubId: string): Promise<ActionResult<Raffle[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('raffles')
    .select('*')
    .eq('club_id', clubId)
    .in('status', ['drawn', 'cancelled'])
    .order('drawn_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

export async function buyTickets(
  raffleId: string,
  quantity: number
): Promise<ActionResult<{ tickets_purchased: number; scores_spent: number; ticket_numbers: number[] }>> {
  const supabase = await createClient();
  await requireUser();

  const { data, error } = await supabase.rpc('buy_raffle_tickets', {
    p_raffle_id: raffleId,
    p_quantity: quantity,
  });

  if (error) return { success: false, error: error.message };
  if (!data.ok) {
    const msgs: Record<string, string> = {
      raffle_not_active: 'This raffle is no longer active.',
      invalid_quantity: 'Invalid quantity.',
      ticket_limit_exceeded: `You can only hold up to ${data.max} tickets (you have ${data.current}).`,
      sold_out: `Only ${data.remaining} ticket(s) remaining.`,
      insufficient_scores: `You need ${data.cost} Scores but only have ${data.balance}.`,
    };
    return { success: false, error: msgs[data.error] ?? data.error };
  }

  return { success: true, data: { tickets_purchased: data.tickets_purchased, scores_spent: data.scores_spent, ticket_numbers: data.ticket_numbers ?? [] } };
}

export async function getRaffleWinners(raffleId: string): Promise<ActionResult<RaffleWinner[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('raffle_winners')
    .select('*, profile:profiles(full_name)')
    .eq('raffle_id', raffleId)
    .order('prize_rank');

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as RaffleWinner[] };
}

export async function adminCreateRaffle(formData: {
  club_id: string;
  title: string;
  description?: string;
  prize_description: string;
  ticket_cost_scores: number;
  max_tickets_per_player: number;
  total_tickets_available?: number;
  winner_count: number;
  draw_date?: string;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const user = await requireUser();

  const { data, error } = await supabase
    .from('raffles')
    .insert({ ...formData, created_by: user.id })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: { id: data.id } };
}

export async function adminDrawRaffle(raffleId: string): Promise<ActionResult<{ winners: Array<{ rank: number; ticket_number: number; user_id: string }> }>> {
  const supabase = await createClient();
  await requireUser();

  const { data, error } = await supabase.rpc('draw_raffle', { p_raffle_id: raffleId });

  if (error) return { success: false, error: error.message };
  if (!data.ok) {
    const msgs: Record<string, string> = {
      raffle_not_active: 'Raffle is not active.',
      access_denied: 'You do not have permission to draw this raffle.',
    };
    return { success: false, error: msgs[data.error] ?? data.error };
  }

  return { success: true, data: { winners: data.winners ?? [] } };
}

export async function getMyTickets(raffleId: string): Promise<ActionResult<RaffleTicket[]>> {
  const supabase = await createClient();
  const user = await requireUser();

  const { data, error } = await supabase
    .from('raffle_tickets')
    .select('*')
    .eq('raffle_id', raffleId)
    .eq('user_id', user.id)
    .order('ticket_number');

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}
