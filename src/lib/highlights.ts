// Highlight reels: the top-scoring 5-second segments from an /analyse session.

export const HIGHLIGHTS_BUCKET = 'session-videos';
export const SIGNED_URL_SECONDS = 60 * 60;
/** Highlight clips stay on the phone until private storage is live. */
export const HIGHLIGHT_UPLOAD_ENABLED = process.env.NEXT_PUBLIC_HIGHLIGHT_UPLOAD_ENABLED === 'true';
export const SEGMENT_SECONDS = 5;
export const MAX_CLIPS = 3;

export type HighlightMode = 'bowling' | 'batting';

export type HighlightClip = {
  url: string;
  path: string;
  start_sec: number;
  end_sec: number;
  score: number;
  label: string;
};

export type Highlight = {
  id: string;
  session_date: string;
  video_url: string;
  clips: HighlightClip[];
  top_clip_url: string | null;
};

export function formatSessionDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

const LABELS: Record<HighlightMode, string[]> = {
  bowling: ['Best delivery', 'Clean action', 'Solid rhythm'],
  batting: ['Top shot', 'Clean technique', 'Solid stance'],
};

export function clipLabel(mode: HighlightMode, rank: number) {
  return LABELS[mode][rank] ?? 'Highlight';
}

type ClipInput = { path: string; start_sec: number; end_sec: number; score: number };
export type HighlightRequest = { mode: HighlightMode; clips: ClipInput[] };

const CLIP_FILE = /^[0-9a-f-]{36}\/\d{10,16}\/clip-[1-3]\.(webm|mp4)$/;

// Validates a POST /api/highlights body. Clip paths must sit in the caller's own folder.
export function parseHighlightRequest(body: unknown, userId: string): { data: HighlightRequest } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid request body' };
  const { mode, clips } = body as Record<string, unknown>;
  if (mode !== 'bowling' && mode !== 'batting') return { error: 'mode must be bowling or batting' };
  if (!Array.isArray(clips) || clips.length === 0 || clips.length > MAX_CLIPS) {
    return { error: `clips must have 1–${MAX_CLIPS} entries` };
  }

  const parsed: ClipInput[] = [];
  for (const clip of clips) {
    const { path, start_sec, end_sec, score } = (clip ?? {}) as Record<string, unknown>;
    const numbers = [start_sec, end_sec, score];
    if (typeof path !== 'string' || !CLIP_FILE.test(path) || !path.startsWith(`${userId}/`)) {
      return { error: 'Invalid clip path' };
    }
    if (numbers.some((n) => typeof n !== 'number' || !Number.isFinite(n))) return { error: 'Invalid clip timing or score' };
    if ((start_sec as number) < 0 || (end_sec as number) <= (start_sec as number)) return { error: 'Invalid clip timing' };
    parsed.push({
      path,
      start_sec: start_sec as number,
      end_sec: end_sec as number,
      score: Math.round(Math.min(100, Math.max(0, score as number))),
    });
  }

  return { data: { mode, clips: parsed.sort((a, b) => b.score - a.score) } };
}

/** Storage path for a clip, whether the saved URL is a path, a public URL, or a signed URL. */
export function clipStoragePath(clip: { path: string; url: string }): string | null {
  if (clip.path && !clip.path.startsWith('http') && !clip.path.startsWith('demo/')) return clip.path;
  for (const marker of [`/object/public/${HIGHLIGHTS_BUCKET}/`, `/object/sign/${HIGHLIGHTS_BUCKET}/`]) {
    const at = clip.url.indexOf(marker);
    if (at >= 0) return decodeURIComponent(clip.url.slice(at + marker.length).split('?')[0]);
  }
  return null;
}

type UrlSigner = {
  storage: {
    from: (bucket: string) => {
      createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl: string } | null }>;
    };
  };
};

/** Replace stored public URLs with a one-hour signed URL. External demo clips are left alone. */
export async function withSignedUrls<T extends Highlight>(signer: UrlSigner, highlight: T): Promise<T> {
  const clips = await Promise.all(highlight.clips.map(async (clip) => {
    const path = clipStoragePath(clip);
    if (!path) return clip;
    const { data } = await signer.storage.from(HIGHLIGHTS_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    return data?.signedUrl ? { ...clip, path, url: data.signedUrl } : clip;
  }));
  return {
    ...highlight,
    clips,
    video_url: clips[0]?.url ?? highlight.video_url,
    top_clip_url: clips[0]?.url ?? highlight.top_clip_url,
  };
}
