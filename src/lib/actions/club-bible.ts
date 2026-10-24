'use server';

import { createClient } from '@/lib/supabase/server';
import { getAnthropic, extractText } from '@/lib/ai/client';
import type { ActionResult } from '@/lib/types/action';
import type { ClubMilestone, ClubBible, AddMilestoneInput } from '@/lib/types/club-bible';
import { revalidatePath } from 'next/cache';

// ── Milestones ───────────────────────────────────────────────────────────────

export async function getMilestones(clubId: string): Promise<ActionResult<ClubMilestone[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('club_milestones')
    .select('*')
    .eq('club_id', clubId)
    .order('year', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as ClubMilestone[] };
}

export async function addMilestone(input: AddMilestoneInput): Promise<ActionResult<ClubMilestone>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data, error } = await supabase
    .from('club_milestones')
    .insert({
      club_id: input.club_id,
      year: input.year,
      title: input.title,
      description: input.description,
      category: input.category,
      is_featured: input.is_featured ?? false,
      added_by: user.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath('/club-bible');
  revalidatePath('/admin/club/club-bible');
  return { success: true, data: data as ClubMilestone };
}

export async function deleteMilestone(milestoneId: string): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('club_milestones')
    .delete()
    .eq('id', milestoneId);

  if (error) return { success: false, error: error.message };
  revalidatePath('/club-bible');
  revalidatePath('/admin/club/club-bible');
  return { success: true, data: null };
}

// ── Club Bible ───────────────────────────────────────────────────────────────

export async function getClubBible(clubId: string): Promise<ActionResult<{ bible: ClubBible | null; milestones: ClubMilestone[] }>> {
  const supabase = await createClient();

  const [bibleResult, milestonesResult] = await Promise.all([
    supabase.from('club_bible').select('*').eq('club_id', clubId).maybeSingle(),
    supabase.from('club_milestones').select('*').eq('club_id', clubId).order('year', { ascending: true }),
  ]);

  if (bibleResult.error) return { success: false, error: bibleResult.error.message };
  if (milestonesResult.error) return { success: false, error: milestonesResult.error.message };

  return {
    success: true,
    data: {
      bible: bibleResult.data as ClubBible | null,
      milestones: milestonesResult.data as ClubMilestone[],
    },
  };
}

export async function generateClubBible(clubId: string): Promise<ActionResult<ClubBible>> {
  const supabase = await createClient();

  // Get club name
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .select('name')
    .eq('id', clubId)
    .single();

  if (clubError || !club) return { success: false, error: 'Club not found' };

  // Get all milestones sorted chronologically
  const { data: milestones, error: msError } = await supabase
    .from('club_milestones')
    .select('*')
    .eq('club_id', clubId)
    .order('year', { ascending: true });

  if (msError) return { success: false, error: msError.message };
  if (!milestones || milestones.length === 0) {
    return { success: false, error: 'Add some milestones before generating the Club Bible.' };
  }

  const prompt = `You are writing the official Club Bible for ${club.name}, a cricket club.
Based on these milestones and achievements, write an engaging, warm, and proud narrative
about this club's history in 3-4 paragraphs. Make it feel like it belongs in a proud
cricket club's pavilion — respectful of traditions, celebrating achievements, and building
a sense of identity.

Club Milestones:
${(milestones as ClubMilestone[]).map((m: ClubMilestone) => `${m.year}: [${m.category}] ${m.title} — ${m.description}`).join('\n')}

Write the narrative now:`;

  const anthropic = getAnthropic();
  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const narrative = extractText(message);

  // Upsert into club_bible
  const { data, error } = await supabase
    .from('club_bible')
    .upsert(
      {
        club_id: clubId,
        generated_narrative: narrative,
        last_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'club_id' }
    )
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  // Increment generation_count separately (upsert resets it; do a follow-up update)
  await supabase
    .from('club_bible')
    .update({ generation_count: (data as ClubBible).generation_count + 1 })
    .eq('club_id', clubId);

  revalidatePath('/club-bible');
  revalidatePath('/admin/club/club-bible');
  return { success: true, data: data as ClubBible };
}
