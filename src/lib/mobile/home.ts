// Server-only. Everything the phone app's Home screen shows, for a caller whose id has already
// been verified. Mirrors the website's Home (app/(dashboard)/dashboard/page.tsx).

import { createAdminClient } from '@/lib/supabase/admin';
import { getPrimaryClubId, ukToday, weekStartIso } from '@/lib/scores/context';
import { getMyScratchCards } from '@/lib/scratch/service';
import { getMemberClubIds, isUuid } from '@/lib/mobile/club-data';
import { isAvailability, leaguePlace, streakFrom, type Availability, type LeaguePlace } from '@/lib/mobile/home-logic';
import type { ActionResult } from '@/lib/types/action';

export type MobileHome = {
  club: string | null;
  junior: boolean;
  fixture: { id: string; opponent: string; date: string; time: string | null; venue: string | null; format: string; myStatus: string } | null;
  streak: { day: number; doneToday: boolean };
  league: LeaguePlace | null;
  cards: { on: boolean; waiting: number; milestone: number | null; into: number; hint: string | null };
  insights: string[];
  recent: Array<{ id: string; title: string; amount: number }>;
};

const EMPTY: MobileHome = {
  club: null, junior: false, fixture: null, streak: { day: 0, doneToday: false }, league: null,
  cards: { on: false, waiting: 0, milestone: null, into: 0, hint: null }, insights: [], recent: [],
};

export async function getHomeForUser(userId: string): Promise<MobileHome> {
  const clubId = await getPrimaryClubId(userId);
  if (!clubId) return EMPTY;

  const admin = createAdminClient();
  const today = ukToday();
  const yesterday = ukToday(new Date(Date.now() - 24 * 60 * 60 * 1000));

  const [club, member, fixtures, checkins, totals, ledger, rules, wallet, insights, cards] = await Promise.all([
    admin.from('clubs').select('name').eq('id', clubId).maybeSingle(),
    admin.from('club_members').select('is_junior').eq('user_id', userId).eq('club_id', clubId).maybeSingle(),
    admin.from('fixtures').select('id, opponent, match_date, match_time, venue, format').eq('club_id', clubId)
      .gte('match_date', today).order('match_date', { ascending: true }).limit(1),
    admin.from('daily_checkins').select('checkin_date, streak_day').eq('user_id', userId).in('checkin_date', [today, yesterday]),
    admin.rpc('club_scores_totals', { p_club_id: clubId, p_since: weekStartIso() }),
    admin.from('scores_ledger').select('id, source, amount').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    admin.from('scores_rules').select('source, label'),
    admin.from('creds_wallet').select('lifetime_earned').eq('user_id', userId).maybeSingle(),
    admin.from('coaching_insights').select('finding').eq('player_id', userId).order('generated_at', { ascending: false }).limit(2),
    getMyScratchCards(userId),
  ]);

  const next = (fixtures.data ?? [])[0] ?? null;
  let myStatus = 'unknown';
  if (next) {
    const { data } = await admin.from('fixture_availability').select('status').eq('fixture_id', next.id).eq('user_id', userId).maybeSingle();
    myStatus = (data?.status as string | undefined) ?? 'unknown';
  }

  const labelOf = new Map((rules.data ?? []).map((r) => [r.source as string, r.label as string]));
  const milestone = cards.milestone && cards.milestone > 0 ? cards.milestone : null;
  const lifetime = (wallet.data?.lifetime_earned as number | undefined) ?? 0;

  return {
    club: (club.data?.name as string | undefined) ?? null,
    junior: member.data?.is_junior === true,
    fixture: next
      ? {
          id: next.id as string, opponent: next.opponent as string, date: next.match_date as string,
          time: (next.match_time as string | null) ?? null, venue: (next.venue as string | null) ?? null,
          format: (next.format as string | null) ?? 'league', myStatus,
        }
      : null,
    streak: streakFrom((checkins.data ?? []) as Array<{ checkin_date: string; streak_day: number }>, today, yesterday),
    league: leaguePlace(
      ((totals.data ?? []) as Array<{ user_id: string; total: number | string }>).map((t) => ({ user_id: t.user_id, total: Number(t.total) })),
      userId,
    ),
    cards: {
      on: !cards.unavailable && cards.gate !== 'junior',
      waiting: cards.waiting.length,
      milestone,
      into: milestone ? lifetime % milestone : 0,
      hint: cards.tasks[0] ?? null,
    },
    insights: (insights.data ?? []).map((i) => i.finding as string).filter(Boolean),
    recent: (ledger.data ?? []).map((r) => ({
      id: r.id as string,
      title: labelOf.get(r.source as string) ?? 'Scores earned',
      amount: r.amount as number,
    })),
  };
}

/** Saves whether the caller can play a fixture. Only for fixtures of a club they belong to. */
export async function setAvailabilityForUser(userId: string, fixtureId: unknown, status: unknown): Promise<ActionResult<{ status: Availability }>> {
  if (!isUuid(fixtureId) || !isAvailability(status)) return { success: false, error: 'That is not a valid reply.' };
  const admin = createAdminClient();
  const { data: fixture } = await admin.from('fixtures').select('club_id').eq('id', fixtureId).maybeSingle();
  if (!fixture || !(await getMemberClubIds(userId)).includes(fixture.club_id as string)) return { success: false, error: 'Fixture not found.' };

  const { error } = await admin.from('fixture_availability').upsert(
    { fixture_id: fixtureId, user_id: userId, status, updated_at: new Date().toISOString() },
    { onConflict: 'fixture_id,user_id' },
  );
  if (error) return { success: false, error: 'Could not save. Please try again.' };
  return { success: true, data: { status } };
}
