// "Compared with last time" and the run across several analyses. Used under an analysis on the
// Analyse page, and on a coach's view of a player's progress.

import type { Comparison, Trend } from '@/lib/analysis/compare';

const BLUE = '#60A5FA';
const DIRECTION_COLOUR = { improving: '#22C55E', slipping: '#FBBF24', mixed: '#A3A3A3', steady: '#A3A3A3' } as const;

// Bars are scaled between the lowest and highest mark in the run, so a small rise is still visible
const barHeight = (mark: number, all: number[]) => {
  const lo = Math.min(...all); const hi = Math.max(...all);
  return hi === lo ? 70 : 30 + (70 * (mark - lo)) / (hi - lo);
};
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export function ComparisonPanel({ comparison, trend, title }: { comparison: Comparison | null; trend: Trend | null; title?: string }) {
  return (
    <div className="mt-5 rounded-lg border px-4 py-3" style={{ borderColor: 'rgba(96,165,250,0.35)', background: 'rgba(96,165,250,0.06)' }}>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: BLUE }}>
        {title ?? (comparison ? `Compared with last time${comparison.when ? ` · ${day(comparison.when)}` : ''}` : 'Your first of this kind')}
      </p>

      {!comparison ? (
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-200">
          This is the first one of this kind saved. Next time this shows what got better and what did not.
        </p>
      ) : (
        <>
          <p className="mt-1.5 text-sm font-semibold text-white">{comparison.headline}</p>
          {([
            ['What got better', comparison.better, '#22C55E'],
            ['What did not get better', comparison.worse, '#FBBF24'],
            ['About the same', comparison.same, '#A3A3A3'],
          ] as const).map(([heading, list, colour]) => list.length > 0 && (
            <div key={heading} className="mt-3">
              <p className="text-xs font-semibold" style={{ color: colour }}>{heading}</p>
              <ul className="mt-1 space-y-1.5">
                {list.map((c) => (
                  <li key={c.key} className="text-sm leading-relaxed text-neutral-200">
                    <span className="font-semibold text-white">{c.label}</span> ({c.before} to {c.now}): {c.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {comparison.better.length + comparison.worse.length + comparison.same.length === 0 && (
            <p className="mt-1.5 text-sm text-neutral-300">The two clips did not share any measures to compare.</p>
          )}
        </>
      )}

      {trend && (
        <div className="mt-4 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold" style={{ color: BLUE }}>The trend</p>
          {/* The run of overall marks as bars, oldest on the left */}
          <div className="mt-2 flex items-end gap-1.5" style={{ height: 44 }} role="img" aria-label={trend.text}>
            {trend.marks.map((mark, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end" style={{ height: '100%', maxWidth: 44 }}>
                <div style={{ width: '100%', height: `${barHeight(mark, trend.marks)}%`, borderRadius: 4, background: i === trend.marks.length - 1 ? BLUE : 'rgba(96,165,250,0.35)' }} />
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-neutral-200">{trend.text}</p>
          {trend.measures.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {trend.measures.map((m) => (
                <li key={m.key} className="text-sm leading-relaxed text-neutral-200">
                  <span className="font-semibold" style={{ color: DIRECTION_COLOUR[m.direction] }}>{m.label}</span>: {m.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
