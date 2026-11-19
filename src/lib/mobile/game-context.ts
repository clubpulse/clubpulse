// Server-only. What a game needs to know before it pays anything: the member's club, whether the
// club has the game's Scores rule switched on, and what it is worth there.

import { createAdminClient } from '@/lib/supabase/admin';
import { getPrimaryClubId, ukToday } from '@/lib/scores/context';

export type GameContext = {
  admin: ReturnType<typeof createAdminClient>;
  clubId: string | null;
  /** Scores for one unit of the rule at this club. */
  value: number;
  /** False when the club switched the rule off, or the database change has not been applied. */
  pays: boolean;
  today: string;
};

export async function gameContext(userId: string, rule: string): Promise<GameContext> {
  const admin = createAdminClient();
  const clubId = await getPrimaryClubId(userId);
  const today = ukToday();
  if (!clubId) return { admin, clubId: null, value: 0, pays: false, today };
  const [{ data: row }, { data: override }] = await Promise.all([
    admin.from('scores_rules').select('default_amount').eq('source', rule).maybeSingle(),
    admin.from('club_scores_rules').select('amount, is_enabled').eq('club_id', clubId).eq('source', rule).maybeSingle(),
  ]);
  return {
    admin,
    clubId,
    value: (override?.amount as number | null | undefined) ?? (row?.default_amount as number | undefined) ?? 0,
    pays: !!row && (override ? (override.is_enabled as boolean) : true),
    today,
  };
}

/** Counts one completion toward a scratch card, where the club rewards games. Never throws. */
export async function countTowardCard(ctx: GameContext, userId: string, reference: string): Promise<boolean> {
  if (!ctx.clubId) return false;
  try {
    const { data } = await ctx.admin.rpc('record_card_task', { p_user_id: userId, p_club_id: ctx.clubId, p_task: 'game', p_reference: reference });
    return data === true;
  } catch {
    return false;
  }
}
