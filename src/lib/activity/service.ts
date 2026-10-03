import type { SupabaseClient } from '@supabase/supabase-js';
import type { WalletTransaction } from '@/lib/types/creds';

export type StreakInfo = {
  streakDay:      number;
  loggedToday:    boolean;   // steps logged or shield used today
  protectedToday: boolean;
  atRisk:         boolean;   // there's a streak but today isn't covered yet
};

// All dates are UTC, matching the steps API routes
const utcDate = (offsetDays = 0) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

type Embedded<T> = T | T[] | null | undefined;
const one = <T,>(value: Embedded<T>): T | null => (Array.isArray(value) ? value[0] ?? null : value ?? null);

export async function getRecentActivity(
  supabase: SupabaseClient,
  userId: string,
  limit = 5
): Promise<WalletTransaction[]> {
  const [perfs, steps] = await Promise.all([
    supabase
      .from('performances')
      .select('id, category, creds_earned, performed_at, sport:sport_configs ( display_name, icon_emoji )')
      .eq('user_id', userId)
      .order('performed_at', { ascending: false })
      .limit(limit),
    supabase
      .from('steps_log')
      .select('id, log_date, step_count, creds_earned, streak_protected, synced_at')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
      .limit(limit),
  ]);

  const items: WalletTransaction[] = [];

  for (const p of perfs.data ?? []) {
    const sport = one<{ display_name: string; icon_emoji: string }>(p.sport);
    items.push({
      id:          `perf-${p.id}`,
      kind:        'performance',
      title:       `${sport?.icon_emoji ?? '🏅'} ${sport?.display_name ?? 'Sport'} · ${p.category}`,
      amount:      p.creds_earned,
      occurred_at: p.performed_at,
    });
  }

  for (const s of steps.data ?? []) {
    items.push({
      id:          `steps-${s.id}`,
      kind:        'steps',
      title:       s.step_count > 0 ? `🚶 ${Number(s.step_count).toLocaleString('en-GB')} steps` : '🛡️ Streak shield used',
      amount:      s.creds_earned,
      occurred_at: s.synced_at ?? `${s.log_date}T00:00:00Z`,
    });
  }

  return items
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, limit);
}

// Union of every place Creds move. There is no ledger table, so this is assembled on read.
// A source whose table doesn't exist yet (migration not run) is simply skipped.
export async function getWalletHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<WalletTransaction[]> {
  const [perfs, steps, awin, volunteering, redemptions] = await Promise.all([
    supabase
      .from('performances')
      .select('id, category, creds_earned, performed_at, sport:sport_configs ( display_name, icon_emoji )')
      .eq('user_id', userId)
      .gt('creds_earned', 0)
      .order('performed_at', { ascending: false })
      .limit(limit),
    supabase
      .from('steps_log')
      .select('id, log_date, step_count, creds_earned, synced_at')
      .eq('user_id', userId)
      .gt('creds_earned', 0)
      .order('log_date', { ascending: false })
      .limit(limit),
    supabase
      .from('awin_transactions')
      .select('id, creds_awarded, created_at')
      .eq('user_id', userId)
      .gt('creds_awarded', 0)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('volunteer_sessions')
      .select('id, role, creds_awarded, session_date, created_at')
      .eq('user_id', userId)
      .gt('creds_awarded', 0)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('reward_redemptions')
      .select('id, creds_spent, redeemed_at, reward:rewards_catalogue ( title )')
      .eq('user_id', userId)
      .order('redeemed_at', { ascending: false })
      .limit(limit),
  ]);

  const items: WalletTransaction[] = [];

  for (const p of perfs.data ?? []) {
    const sport = one<{ display_name: string; icon_emoji: string }>(p.sport);
    items.push({
      id: `perf-${p.id}`, kind: 'performance', amount: p.creds_earned, occurred_at: p.performed_at,
      title: `${sport?.display_name ?? 'Sport'} ${p.category}`,
    });
  }
  for (const s of steps.data ?? []) {
    items.push({
      id: `steps-${s.id}`, kind: 'steps', amount: s.creds_earned,
      occurred_at: s.synced_at ?? `${s.log_date}T00:00:00Z`,
      title: `${Number(s.step_count).toLocaleString('en-GB')} steps`,
    });
  }
  for (const a of awin.data ?? []) {
    items.push({ id: `awin-${a.id}`, kind: 'shopping', amount: a.creds_awarded, occurred_at: a.created_at, title: 'Shopping cashback' });
  }
  for (const v of volunteering.data ?? []) {
    items.push({
      id: `vol-${v.id}`, kind: 'volunteering', amount: v.creds_awarded, occurred_at: v.created_at,
      title: `Volunteered: ${String(v.role).replace(/_/g, ' ')}`,
    });
  }
  for (const r of redemptions.data ?? []) {
    const reward = one<{ title: string }>(r.reward);
    items.push({
      id: `redeem-${r.id}`, kind: 'redemption', amount: -r.creds_spent, occurred_at: r.redeemed_at,
      title: `Redeemed: ${reward?.title ?? 'reward'}`,
    });
  }

  return items.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, limit);
}

export async function getStreakInfo(supabase: SupabaseClient, userId: string): Promise<StreakInfo> {
  const { data } = await supabase
    .from('steps_log')
    .select('log_date, step_count, streak_day, streak_protected')
    .eq('user_id', userId)
    .order('log_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const none: StreakInfo = { streakDay: 0, loggedToday: false, protectedToday: false, atRisk: false };
  if (!data) return none;

  if (data.log_date === utcDate()) {
    return {
      streakDay:      data.streak_day,
      loggedToday:    data.step_count > 0 || data.streak_protected,
      protectedToday: data.streak_protected,
      atRisk:         false,
    };
  }

  if (data.log_date === utcDate(-1) && data.streak_day > 0) {
    return { streakDay: data.streak_day, loggedToday: false, protectedToday: false, atRisk: true };
  }

  return none;
}
