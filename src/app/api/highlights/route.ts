// POST /api/highlights  { mode, clips: [{ path, start_sec, end_sec, score }] }
//   → { highlight_id, clips: [{ url, score, label }] }
// Clips are already uploaded to the session-videos bucket by the browser, which also scored them
// (pose detection needs MediaPipe in the browser). This validates them and saves the reel.
// Auth: Bearer access token (Expo) or cookie session (web).

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { HIGHLIGHTS_BUCKET, clipLabel, parseHighlightRequest, type HighlightClip } from '@/lib/highlights';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { supabase, user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const parsed = parseHighlightRequest(await readJson(req), user.id);
  if ('error' in parsed) return fail(parsed.error);
  const { mode, clips: input } = parsed.data;

  // Every clip must sit in one session folder that actually exists in storage
  const folder = input[0].path.slice(0, input[0].path.lastIndexOf('/'));
  if (input.some((clip) => !clip.path.startsWith(`${folder}/`))) return fail('Clips must come from one session');
  const { data: files, error: listError } = await supabase.storage.from(HIGHLIGHTS_BUCKET).list(folder);
  if (listError) return fail(listError.message, 500);
  const uploaded = new Set((files ?? []).map((file) => `${folder}/${file.name}`));
  if (input.some((clip) => !uploaded.has(clip.path))) return fail('Clip not found in storage');

  const clips: HighlightClip[] = input.map((clip, rank) => ({
    ...clip,
    url: supabase.storage.from(HIGHLIGHTS_BUCKET).getPublicUrl(clip.path).data.publicUrl,
    label: clipLabel(mode, rank),
  }));

  const { data, error } = await supabase
    .from('highlights')
    .insert({ user_id: user.id, video_url: clips[0].url, clips, top_clip_url: clips[0].url })
    .select('id')
    .single();
  if (error) return fail(error.message, 500);

  return NextResponse.json({
    highlight_id: data.id,
    clips: clips.map(({ url, score, label }) => ({ url, score, label })),
  });
}
