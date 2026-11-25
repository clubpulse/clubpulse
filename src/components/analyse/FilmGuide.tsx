'use client';

import { useEffect, useId, useRef } from 'react';
import { GUIDE_CARDS, guideKey } from '@/lib/analysis/film-guide';

type Props = {
  open: boolean;
  step: number;
  onStep: (step: number) => void;
  onClose: () => void;
};

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function AngleDrawing() {
  return (
    <svg viewBox="0 0 220 120" className="h-28 w-full" role="img" aria-label="A phone at chest height, level, filming a player from the side.">
      <title>Side-on at chest height</title>
      <rect x="8" y="36" width="28" height="48" rx="4" fill="none" stroke="#EFC84A" strokeWidth="2" />
      <rect x="18" y="54" width="8" height="8" fill="#EFC84A" />
      <line x1="36" y1="60" x2="78" y2="60" stroke="#94a3b8" strokeWidth="2" />
      <circle cx="110" cy="42" r="10" fill="none" stroke="white" strokeWidth="2" />
      <path d="M110 52 V78 M110 62 H92 M110 62 H128 M110 78 L98 104 M110 78 L124 104" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="108" x2="170" y2="108" stroke="#64748b" strokeWidth="2" />
    </svg>
  );
}

function FrameDrawing() {
  return (
    <svg viewBox="0 0 220 120" className="h-28 w-full" role="img" aria-label="A full body, head to feet, inside the camera frame. One person.">
      <title>Whole body in frame</title>
      <rect x="70" y="8" width="80" height="104" rx="6" fill="none" stroke="#EFC84A" strokeWidth="2" />
      <circle cx="110" cy="28" r="8" fill="none" stroke="white" strokeWidth="2" />
      <path d="M110 36 V62 M110 48 H96 M110 48 H124 M110 62 L100 96 M110 62 L122 96" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SteadyDrawing() {
  return (
    <svg viewBox="0 0 220 120" className="h-28 w-full" role="img" aria-label="A phone propped on a stand, still, with the light behind the camera.">
      <title>Phone held still</title>
      <circle cx="36" cy="28" r="10" fill="none" stroke="#EFC84A" strokeWidth="2" />
      <path d="M36 38 V52" stroke="#EFC84A" strokeWidth="2" />
      <rect x="96" y="24" width="28" height="48" rx="4" fill="none" stroke="white" strokeWidth="2" />
      <path d="M100 78 L110 100 L120 78" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="86" y1="104" x2="134" y2="104" stroke="#64748b" strokeWidth="2" />
    </svg>
  );
}

const DRAWINGS = [AngleDrawing, FrameDrawing, SteadyDrawing];

export function FilmGuide({ open, step, onStep, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const card = GUIDE_CARDS[Math.min(GUIDE_CARDS.length - 1, Math.max(0, step))];
  const Drawing = DRAWINGS[Math.min(DRAWINGS.length - 1, Math.max(0, step))];
  const last = step >= GUIDE_CARDS.length - 1;

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = dialogRef.current;
    const items = () => [...(root?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    items()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      const list = items();
      const atFirst = document.activeElement === list[0];
      const atLast = document.activeElement === list[list.length - 1];
      const action = guideKey(event.key, event.shiftKey, atFirst, atLast);
      if (action === 'close') {
        event.preventDefault();
        onClose();
      } else if (action === 'focus-first') {
        event.preventDefault();
        list[0]?.focus();
      } else if (action === 'focus-last') {
        event.preventDefault();
        list[list.length - 1]?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">How to film · {step + 1} of {GUIDE_CARDS.length}</p>
        <h2 id={titleId} className="mt-1 text-lg font-semibold text-white">{card.title}</h2>
        <div className="mt-4 rounded-xl bg-black/40 px-3 py-2">
          <Drawing />
        </div>
        <ul className="mt-4 space-y-2">
          {card.lines.map((line) => (
            <li key={line} className="text-sm leading-relaxed text-neutral-200">{line}</li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="text-sm font-medium text-neutral-400 underline-offset-2 hover:underline">
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => onStep(step - 1)} className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium text-white">
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? onClose() : onStep(step + 1))}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-neutral-950"
              style={{ background: '#EFC84A' }}
            >
              {last ? 'Start filming' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
