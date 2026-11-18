// Pure. Turns a club's prize pool into the chance of each prize, for showing to the member.

export type PoolPrize = { label: string; weight: number; prize_type?: string };

/**
 * Whole percentages that add up to exactly 100, largest first. Prizes with the same label are
 * merged. Rounding uses the largest-remainder method, so no prize shows 0% unless it truly is.
 */
export function chances(pool: readonly PoolPrize[]): Array<{ label: string; chance: number }> {
  const merged = new Map<string, number>();
  for (const p of pool) {
    if (!(p.weight > 0)) continue;
    const label = p.prize_type === 'try_again' ? 'No prize this time' : p.label;
    merged.set(label, (merged.get(label) ?? 0) + p.weight);
  }
  const total = [...merged.values()].reduce((a, w) => a + w, 0);
  if (total <= 0) return [];

  const rows = [...merged.entries()].map(([label, weight]) => {
    const exact = (weight / total) * 100;
    return { label, floor: Math.floor(exact), rest: exact - Math.floor(exact) };
  });
  let left = 100 - rows.reduce((a, r) => a + r.floor, 0);
  for (const r of [...rows].sort((a, b) => b.rest - a.rest)) {
    if (left <= 0) break;
    r.floor += 1;
    left -= 1;
  }
  return rows.map((r) => ({ label: r.label, chance: r.floor })).sort((a, b) => b.chance - a.chance || a.label.localeCompare(b.label));
}
