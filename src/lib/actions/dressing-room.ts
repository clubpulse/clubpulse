'use server';

import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from '@/lib/types/action';
import type { DressingRoomPost, PollOption } from '@/lib/types/dressing-room';

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getPosts(
  clubId: string,
  limit = 50
): Promise<ActionResult<DressingRoomPost[]>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dressing_room_posts')
    .select(`
      id, club_id, user_id, kind, body, poll_options, poll_votes, pinned, created_at,
      profiles!dressing_room_posts_user_id_fkey ( display_name, avatar_url )
    `)
    .eq('club_id', clubId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) return { success: false, error: error.message };

  const posts = (data ?? []).map((row: Record<string, unknown>) => {
    const profile = row.profiles as { display_name?: string | null; avatar_url?: string | null } | null;
    return {
      id: row.id,
      club_id: row.club_id,
      user_id: row.user_id,
      kind: row.kind,
      body: row.body,
      poll_options: row.poll_options ?? null,
      poll_votes: (row.poll_votes as Record<string, string>) ?? {},
      pinned: row.pinned,
      created_at: row.created_at,
      display_name: profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    } as DressingRoomPost;
  });

  return { success: true, data: posts };
}

export async function createPost(
  clubId: string,
  kind: 'announcement' | 'chat' | 'poll',
  body: string,
  pollOptions?: PollOption[]
): Promise<ActionResult<DressingRoomPost>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('dressing_room_posts')
    .insert({
      club_id: clubId,
      user_id: userId,
      kind,
      body,
      poll_options: pollOptions ?? null,
      poll_votes: {},
    })
    .select('*')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as DressingRoomPost };
}

export async function castVote(
  postId: string,
  optionId: string
): Promise<ActionResult<DressingRoomPost>> {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const supabase = await createClient();

  // Fetch current post to mutate poll_votes and poll_options atomically in JS
  const { data: post, error: fetchErr } = await supabase
    .from('dressing_room_posts')
    .select('poll_votes, poll_options')
    .eq('id', postId)
    .single();

  if (fetchErr) return { success: false, error: fetchErr.message };
  if (!post) return { success: false, error: 'Post not found' };

  const votes = (post.poll_votes as Record<string, string>) ?? {};
  const options = (post.poll_options as PollOption[]) ?? [];

  // Remove previous vote from counts if user already voted
  const prevOptionId = votes[userId];
  if (prevOptionId) {
    const prev = options.find((o) => o.id === prevOptionId);
    if (prev && prev.votes > 0) prev.votes -= 1;
  }

  // Record new vote
  votes[userId] = optionId;
  const chosen = options.find((o) => o.id === optionId);
  if (chosen) chosen.votes += 1;

  const { data, error } = await supabase
    .from('dressing_room_posts')
    .update({ poll_votes: votes, poll_options: options })
    .eq('id', postId)
    .select('*')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as DressingRoomPost };
}

export async function getUserClubId(): Promise<string | null> {
  const userId = await currentUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('club_members')
    .select('club_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  return data?.club_id ?? null;
}
