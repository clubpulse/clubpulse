import { createAdminClient } from '@/lib/supabase/admin';

export type DynamicMultiplier = {
  id:             string;
  club_id:        string | null;
  name:           string;
  multiplier:     number;
  condition_type: 'weather' | 'scarcity' | 'season_phase' | 'manual';
  condition_data: Record<string, unknown>;
  active_from:    string;
  active_until:   string | null;
  created_by:     string | null;
  created_at:     string;
};

// Stacked multipliers compound, but never beyond this, so overlapping events can't run away
export const MAX_COMBINED_MULTIPLIER = 5;

// Multipliers in force right now: platform-wide ones plus, if clubId is given, that club's own
export async function getActiveMultipliers(clubId?: string | null): Promise<DynamicMultiplier[]> {
  const now = Date.now();
  const { data } = await createAdminClient()
    .from('dynamic_multipliers')
    .select('*')
    .lte('active_from', new Date(now).toISOString());

  return ((data ?? []) as DynamicMultiplier[])
    .map((m) => ({ ...m, multiplier: Number(m.multiplier) }))
    .filter((m) => m.active_until === null || Date.parse(m.active_until) > now)
    .filter((m) => m.club_id === null || (!!clubId && m.club_id === clubId));
}

export function applyMultiplier(
  baseCredits: number,
  multipliers: Pick<DynamicMultiplier, 'multiplier'>[]
): number {
  if (!(baseCredits > 0)) return 0;
  const combined = Math.min(
    multipliers.reduce((total, m) => total * m.multiplier, 1),
    MAX_COMBINED_MULTIPLIER
  );
  return Math.round(baseCredits * combined);
}
