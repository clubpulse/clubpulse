'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Notice, NoticePriority } from '@/lib/types/notices';

export interface CreateNoticeInput {
  club_id: string
  title: string
  body: string
  priority: NoticePriority
  is_pinned: boolean
  expires_at?: string
}

export async function getNotices(clubId: string): Promise<Notice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('club_id', clubId)
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getNotices error:', error);
    return [];
  }
  return (data ?? []) as Notice[];
}

export async function adminGetAllNotices(clubId: string): Promise<Notice[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('club_id', clubId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('adminGetAllNotices error:', error);
    return [];
  }
  return (data ?? []) as Notice[];
}

export async function adminCreateNotice(input: CreateNoticeInput): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error } = await supabase.from('notices').insert({
    club_id: input.club_id,
    title: input.title,
    body: input.body,
    priority: input.priority,
    is_pinned: input.is_pinned,
    expires_at: input.expires_at || null,
    posted_by: user.id,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath('/noticeboard');
  revalidatePath('/admin/club/noticeboard');
  return { success: true };
}

export async function adminDeleteNotice(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('notices').delete().eq('id', id);
  if (error) return { success: false, error: error.message };

  revalidatePath('/noticeboard');
  revalidatePath('/admin/club/noticeboard');
  return { success: true };
}

export async function adminTogglePin(id: string, isPinned: boolean): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('notices').update({ is_pinned: isPinned }).eq('id', id);
  if (error) return { success: false, error: error.message };

  revalidatePath('/noticeboard');
  revalidatePath('/admin/club/noticeboard');
  return { success: true };
}
