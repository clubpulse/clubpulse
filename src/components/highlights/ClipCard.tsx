'use client';

import { useEffect, useState } from 'react';
import type { HighlightClip } from '@/lib/highlights';

const CRIMSON = '#9b1c1c';
const SHARE_TITLE = 'My ClubPulse highlight';

type Platform = 'Instagram' | 'TikTok';

// Phones get the native share sheet; desktops (which often have navigator.share too) copy the link instead
function isMobileShare() {
  return typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

export function ClipCard({ clip }: { clip: HighlightClip }) {
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState<Platform | null>(null);

  // Instagram and TikTok accept a video file from the share sheet but not a bare link, so fetch the clip up front:
  // navigator.share has to run straight from the tap, with no download in between.
  useEffect(() => {
    if (!isMobileShare()) return;
    let cancelled = false;
    fetch(clip.url)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return;
        const name = clip.path.split('/').pop() ?? 'highlight.webm';
        const candidate = new File([blob], name, { type: blob.type || 'video/webm' });
        if (navigator.canShare?.({ files: [candidate] })) setFile(candidate);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [clip.url, clip.path]);

  async function share(platform: Platform) {
    if (isMobileShare()) {
      try {
        await navigator.share(file ? { files: [file], title: SHARE_TITLE } : { url: clip.url, title: SHARE_TITLE });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Anything else: fall through to copying the link
      }
    }
    try {
      await navigator.clipboard.writeText(clip.url);
      setCopied(platform);
      setTimeout(() => setCopied((current) => (current === platform ? null : current)), 2000);
    } catch {
      window.prompt('Copy this link', clip.url);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950">
      <div className="relative bg-black" style={{ aspectRatio: '16 / 9' }}>
        <video src={clip.url} autoPlay muted loop playsInline preload="auto" className="h-full w-full object-contain" />
        <span className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow"
          style={{ background: CRIMSON }}>
          {clip.score}/100
        </span>
      </div>
      <div className="p-4">
        <p className="font-semibold text-white">{clip.label}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['Instagram', 'TikTok'] as const).map((platform) => (
            <button
              key={platform}
              type="button"
              onClick={() => share(platform)}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              {copied === platform ? 'Link copied!' : platform}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
