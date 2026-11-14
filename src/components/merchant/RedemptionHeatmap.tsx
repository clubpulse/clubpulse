import type { PeakWindow } from '@/lib/types/merchant';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Day-of-week x hour grid (UTC). Windows with too few redemptions are suppressed upstream.
export function RedemptionHeatmap({ windows }: { windows: PeakWindow[] }) {
  if (windows.length === 0) return <p className="text-sm text-neutral-500">Not enough data to show peak times yet.</p>;

  const counts = new Map(windows.map((w) => [`${w.dayOfWeek}-${w.hour}`, w.count]));
  const max = Math.max(...windows.map((w) => w.count));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="mb-1 ml-10 grid grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5 text-[10px] text-neutral-600">
          {Array.from({ length: 24 }, (_, hour) => (
            <span key={hour} className="text-center">{hour % 6 === 0 ? hour : ''}</span>
          ))}
        </div>
        {DAYS.map((day, dayOfWeek) => (
          <div key={day} className="mb-0.5 flex items-center gap-1">
            <span className="w-9 text-xs text-neutral-500">{day}</span>
            <div className="grid flex-1 grid-cols-[repeat(24,minmax(0,1fr))] gap-0.5">
              {Array.from({ length: 24 }, (_, hour) => {
                const count = counts.get(`${dayOfWeek}-${hour}`) ?? 0;
                return (
                  <div
                    key={hour}
                    title={`${day} ${hour}:00 UTC: ${count} redemptions`}
                    className="aspect-square rounded-sm bg-brand-gold"
                    style={{ opacity: count === 0 ? 0.06 : 0.2 + 0.8 * (count / max) }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-neutral-600">Times are in UTC.</p>
    </div>
  );
}
