'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/server';
import type { ActionResult } from '@/lib/types/action';
import type { CommunityPot, PotProposal, PotContribution } from '@/lib/types/community-pot';

export async function getCommunityPot(clubId: string): Promise<ActionResult<CommunityPot>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('community_pot')
    .select('*')
    .eq('club_id', clubId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };

  // Return zeroed pot if not yet initialised
  return {
    success: true,
    data: data ?? {
      club_id: clubId,
      total_scores: 0,
      total_contributors: 0,
      updated_at: new Date().toISOString(),
    },
  };
}

export async function contributeToPot(
  clubId: string,
  scores: number
): Promise<ActionResult<{ scores_contributed: number }>> {
  const supabase = await createClient();
  await requireUser();

  const { data, error } = await supabase.rpc('contribute_to_pot', {
    p_club_id: clubId,
    p_scores: scores,
  });

  if (error) return { success: false, error: error.message };
  if (!data.ok) {
    const msgs: Record<string, string> = {
      minimum_50_scores: 'Minimum contribution is 50 Scores.',
      insufficient_scores: `Insufficient Scores. Your balance: ${data.balance}.`,
    };
    return { success: false, error: msgs[data.error] ?? data.error };
  }

  return { success: true, data: { scores_contributed: data.scores_contributed } };
}

export async function getProposals(clubId: string): Promise<ActionResult<PotProposal[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: proposals, error } = await supabase
    .from('pot_proposals')
    .select('*')
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };

  const enriched: PotProposal[] = await Promise.all(
    (proposals ?? []).map(async (p) => {
      const { data: vote } = await supabase
        .from('pot_votes')
        .select('vote')
        .eq('proposal_id', p.id)
        .eq('user_id', user.id)
        .maybeSingle();
      return { ...p, my_vote: vote?.vote ?? null };
    })
  );

  return { success: true, data: enriched };
}

export async function voteOnProposal(
  proposalId: string,
  vote: 'for' | 'against'
): Promise<ActionResult<{ vote: string }>> {
  const supabase = await createClient();
  await requireUser();

  const { data, error } = await supabase.rpc('vote_on_proposal', {
    p_proposal_id: proposalId,
    p_vote: vote,
  });

  if (error) return { success: false, error: error.message };
  if (!data.ok) {
    const msgs: Record<string, string> = {
      invalid_vote: 'Invalid vote value.',
      voting_closed: 'Voting is closed for this proposal.',
      not_a_member: 'You must be a club member to vote.',
    };
    return { success: false, error: msgs[data.error] ?? data.error };
  }

  return { success: true, data: { vote: data.vote } };
}

export async function adminCreateProposal(formData: {
  club_id: string;
  title: string;
  description: string;
  scores_requested: number;
  voting_ends_at: string;
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();
  const user = await requireUser();

  const { data, error } = await supabase
    .from('pot_proposals')
    .insert({ ...formData, created_by: user.id })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: { id: data.id } };
}

export async function adminFundProposal(proposalId: string): Promise<ActionResult<{ funded: true }>> {
  const supabase = await createClient();
  await requireUser();

  // Fetch proposal
  const { data: proposal, error: fetchError } = await supabase
    .from('pot_proposals')
    .select('*')
    .eq('id', proposalId)
    .single();

  if (fetchError || !proposal) return { success: false, error: 'Proposal not found' };
  if (proposal.status !== 'voting' && proposal.status !== 'approved') {
    return { success: false, error: 'Proposal cannot be funded in its current state' };
  }

  // Ensure pot has enough
  const { data: pot } = await supabase
    .from('community_pot')
    .select('total_scores')
    .eq('club_id', proposal.club_id)
    .single();

  if (!pot || pot.total_scores < proposal.scores_requested) {
    return { success: false, error: 'Insufficient Scores in the Community Pot' };
  }

  // Deduct from pot and mark funded
  const { error: potError } = await supabase
    .from('community_pot')
    .update({
      total_scores: pot.total_scores - proposal.scores_requested,
      updated_at: new Date().toISOString(),
    })
    .eq('club_id', proposal.club_id);

  if (potError) return { success: false, error: potError.message };

  const { error: proposalError } = await supabase
    .from('pot_proposals')
    .update({ status: 'funded', funded_at: new Date().toISOString() })
    .eq('id', proposalId);

  if (proposalError) return { success: false, error: proposalError.message };

  return { success: true, data: { funded: true } };
}

export async function getMyContributions(clubId: string): Promise<ActionResult<PotContribution[]>> {
  const supabase = await createClient();
  const user = await requireUser();

  const { data, error } = await supabase
    .from('pot_contributions')
    .select('*')
    .eq('club_id', clubId)
    .eq('user_id', user.id)
    .order('contributed_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}
