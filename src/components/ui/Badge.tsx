import type { ReactNode } from 'react';

type Tone = 'neutral' | 'gold' | 'red' | 'green';

const TONES: Record<Tone, string> = {
  neutral: 'bg-neutral-800 text-neutral-300',
  gold:    'bg-brand-gold/15 text-brand-gold',
  red:     'bg-brand-primary/25 text-red-300',
  green:   'bg-emerald-900/40 text-emerald-300',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
