'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/server';
import { isClubAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from '@/lib/types/action';
import type { AttendanceAdminData, ClubMemberLite, MatchFee, TrainingSession } from '@/lib/types/attendance';
import { awardScores, isActiveMember, ukToday } from '@/lib/scores/context';

const PATH = '/admin/club/attendance';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function requireAdmin(clubId: string) {
  const user = await requireUser();
  return (await isClubAdmin(user.id, clubId)) ? user : null;
}

export async function getAttendanceAdmin(clubId: string): Promise<ActionResult<AttendanceAdminData>> {
  if (!(await requireAdmin(clubId))) return { success: false, error: 'Not authorised' };
  const admin = createAdminClient();

  const [{ data: memberRows }, { data: sessionRows }, { data: feeRows }, { data: rules }, { data: overrides }] = await Promise.all([
    admin.from('club_members').select('user_id, is_junior').eq('club_id', clubId).eq('is_active', true),
    admin.from('training_sessions').select('id, session_date, title, training_attendance(user_id)')
      .eq('club_id', clubId).order('session_date', { ascending: false }).limit(10),
    admin.from('match_fees').select('id, user_id, description, amount_pence, due_date, paid_at')
      .eq('club_id', clubId).order('due_date', { ascending: false }).limit(100),
    admin.from('scores_rules').select('source, default_amount').in('source', ['training_attendance', 'match_fee_on_time']),
    admin.from('club_scores_rules').select('source, amount, is_enabled').eq('club_id', clubId).in('source', ['training_attendance', 'match_fee_on_time']),
  ]);

  const ids = (memberRows ?? []).map((m) => m.user_id as string);
  const { data: names } = ids.length
    ? await admin.from('profiles').select('id, full_name, display_name').in('id', ids)
    : { data: [] };
  const nameOf = new Map((names ?? []).map((n) => [n.id as string, ((n.display_name as string) || (n.full_name as string) || 'Player')]));

  const members: ClubMemberLite[] = (memberRows ?? [])
    .map((m) => ({ user_id: m.user_id as string, name: nameOf.get(m.user_id as string) ?? 'Player', is_junior: !!m.is_junior }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const sessions: TrainingSession[] = (sessionRows ?? []).map((s) => ({
    id: s.id as string,
    session_date: s.session_date as string,
    title: s.title as string,
    attendee_ids: ((s.training_attendance as Array<{ user_id: string }> | null) ?? []).map((a) => a.user_id),
  }));

  const fees: MatchFee[] = (feeRows ?? []).map((f) => ({
    id: f.id as string,
    user_id: f.user_id as string,
    player_name: nameOf.get(f.user_id as string) ?? 'Player',
    description: f.description as string,
    amount_pence: f.amount_pence as number,
    due_date: f.due_date as string,
    paid_at: (f.paid_at as string | null) ?? null,
  }));

  const value = (source: string) => {
    const o = (overrides ?? []).find((x) => x.source === source);
    const r = (rules ?? []).find((x) => x.source === source);
    return { amount: (o?.amount as number | null | undefined) ?? (r?.default_amount as number | undefined) ?? 0, on: o ? (o.is_enabled as boolean) : true };
  };
  const t = value('training_attendance'), f = value('match_fee_on_time');

  return { success: true, data: { members, sessions, fees, rewards: { training: t.amount, trainingOn: t.on, fee: f.amount, feeOn: f.on } } };
}

// ── Training ─────────────────────────────────────────────────────────────────

export async function createTrainingSession(clubId: string, values: { date: string; title: string }): Promise<ActionResult<{ id: string }>> {
  const user = await requireAdmin(clubId);
  if (!user) return { success: false, error: 'Not authorised' };
  const title = values.title?.trim().slice(0, 80);
  if (!title || !DATE_RE.test(values.date ?? '')) return { success: false, error: 'Give the session a name and a date.' };

  const { data, error } = await createAdminClient().from('training_sessions')
    .insert({ club_id: clubId, session_date: values.date, title, created_by: user.id }).select('id').single();
  if (error) return { success: false, error: 'Could not create the session.' };
  revalidatePath(PATH);
  return { success: true, data: { id: data.id as string } };
}

/** Marks a player present and pays the training attendance reward once for that session. */
export async function markAttendance(clubId: string, sessionId: string, playerId: string): Promise<ActionResult<{ amount: number }>> {
  const user = await requireAdmin(clubId);
  if (!user) return { success: false, error: 'Not authorised' };
  const admin = createAdminClient();

  const { data: session } = await admin.from('training_sessions').select('id').eq('id', sessionId).eq('club_id', clubId).maybeSingle();
  if (!session) return { success: false, error: 'Session not found.' };
  if (!(await isActiveMember(playerId, clubId))) return { success: false, error: 'That player is not a member of this club.' };

  const { error } = await admin.from('training_attendance').upsert(
    { session_id: sessionId, user_id: playerId, marked_by: user.id },
    { onConflict: 'session_id,user_id', ignoreDuplicates: true },
  );
  if (error) return { success: false, error: 'Could not mark attendance.' };

  // Idempotent on the session id, so marking twice never pays twice. A switched-off rule pays nothing.
  const res = await awardScores(playerId, clubId, 'training_attendance', sessionId);
  revalidatePath(PATH);
  return { success: true, data: { amount: res.ok ? (res.amount ?? 0) : 0 } };
}

// ── Match fees ───────────────────────────────────────────────────────────────

export async function createMatchFees(
  clubId: string,
  values: { description: string; amountPence: number; dueDate: string; playerIds: string[] },
): Promise<ActionResult<{ created: number }>> {
  const user = await requireAdmin(clubId);
  if (!user) return { success: false, error: 'Not authorised' };
  const description = values.description?.trim().slice(0, 80);
  if (!description || !DATE_RE.test(values.dueDate ?? '')) return { success: false, error: 'Add a description and a due date.' };
  if (!Number.isInteger(values.amountPence) || values.amountPence <= 0 || values.amountPence > 100000) {
    return { success: false, error: 'Enter a fee between £0.01 and £1,000.' };
  }
  const ids = [...new Set(values.playerIds ?? [])];
  if (ids.length === 0 || ids.length > 200) return { success: false, error: 'Choose at least one player.' };

  const admin = createAdminClient();
  const { data: members } = await admin.from('club_members').select('user_id').eq('club_id', clubId).eq('is_active', true).in('user_id', ids);
  const valid = (members ?? []).map((m) => m.user_id as string);
  if (valid.length === 0) return { success: false, error: 'None of those players are members of this club.' };

  const { error } = await admin.from('match_fees').insert(
    valid.map((id) => ({ club_id: clubId, user_id: id, description, amount_pence: values.amountPence, due_date: values.dueDate })),
  );
  if (error) return { success: false, error: 'Could not create the fees.' };
  revalidatePath(PATH);
  return { success: true, data: { created: valid.length } };
}

/** Records a fee as paid. Paid on or before the due date (UK time) earns the on-time reward. */
export async function markFeePaid(clubId: string, feeId: string): Promise<ActionResult<{ amount: number; onTime: boolean }>> {
  const user = await requireAdmin(clubId);
  if (!user) return { success: false, error: 'Not authorised' };
  const admin = createAdminClient();

  const { data: rows } = await admin.from('match_fees')
    .update({ paid_at: new Date().toISOString(), marked_by: user.id })
    .eq('id', feeId).eq('club_id', clubId).is('paid_at', null)
    .select('user_id, due_date');
  const fee = rows?.[0];
  if (!fee) return { success: false, error: 'That fee is already marked as paid.' };

  const onTime = ukToday() <= (fee.due_date as string);
  let amount = 0;
  if (onTime) {
    const res = await awardScores(fee.user_id as string, clubId, 'match_fee_on_time', feeId);
    if (res.ok) amount = res.amount ?? 0;
  }
  revalidatePath(PATH);
  return { success: true, data: { amount, onTime } };
}
