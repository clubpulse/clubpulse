import type { SupabaseClient } from '@supabase/supabase-js';
import { HIGHLIGHTS_BUCKET, type Highlight, type HighlightClip } from './highlights';

// Sample reel for testing /highlights without recording a session. Used by scripts/seed-highlights.ts
// and the dev-only "Skip to highlights" button on /analyse. Relative imports only: the script runs under tsx.

// 5-second CC0 clip from MDN, served with CORS so the mobile share button can fetch it
const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

export const DEMO_CLIPS: HighlightClip[] = [
  { url: SAMPLE_VIDEO, path: 'demo/clip-1.mp4', start_sec: 0, end_sec: 5, score: 94, label: 'Best delivery' },
  { url: SAMPLE_VIDEO, path: 'demo/clip-2.mp4', start_sec: 10, end_sec: 15, score: 81, label: 'Clean action' },
  { url: SAMPLE_VIDEO, path: 'demo/clip-3.mp4', start_sec: 20, end_sec: 25, score: 73, label: 'Good follow-through' },
];

export async function insertDemoHighlight(supabase: SupabaseClient, userId: string) {
  return supabase
    .from('highlights')
    // Set explicitly: the deployed highlights table doesn't default session_date
    .insert({
      user_id: userId,
      session_date: new Date().toISOString().split('T')[0],
      video_url: SAMPLE_VIDEO,
      clips: DEMO_CLIPS,
      top_clip_url: SAMPLE_VIDEO,
    })
    .select('id')
    .single();
}

// Unsaved sample reel for /highlights?demo=true
export function demoHighlight(): Highlight {
  return { id: 'demo', session_date: new Date().toISOString(), video_url: SAMPLE_VIDEO, clips: DEMO_CLIPS, top_clip_url: SAMPLE_VIDEO };
}

// Real reels only ever point at our own storage bucket
export function isDemoHighlight(highlight: Pick<Highlight, 'clips'>) {
  return highlight.clips.some((clip) => !clip.url.includes(`/storage/v1/object/public/${HIGHLIGHTS_BUCKET}/`));
}
