// "Short for Saturday": a club that needs players posts the game, and adults nearby say they can play.
// Adults only. A reply tells the poster who you are; contact still goes through the ordinary Connect.

import { createAdminClient } from '@/lib/supabase/admin';
import { checkContent } from './moderation';
import { notify } from './notify';
import { blockedIds, clubsInScope, getViewer, people, ok, no, type Admin, type Result, holdFor } from './service';
import {
  SHORTAGE_NEED_MAX, checkPlace, checkShortageWhen, isShortageFormat, maySeeShortage, mayPostShortage, roughDistance,
  type Scope, type ShortageFormat,
} from './rules';

async function isStaffAt(admin: Admin, userId: string, clubId: string): Promise<boolean> {
  const { data } = await admin.from('club_members').select('role').eq('user_id', userId).eq('club_id', clubId).eq('is_active', true).in('role', ['coach', 'club_admin']).limit(1);
  return (data ?? []).length > 0;
}

export type ShortageCard = {
  id: string; club: string; clubId: string; format: ShortageFormat; playAt: string; need: number; place: string; note: string;
  distance: string | null; mine: boolean; replied: boolean; replies: number; canReply: boolean;
};

export async function listShortages(userId: string, scope: Scope, within?: number): Promise<Result<{ shortages: ShortageCard[] }>> {
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const viewer = await getViewer(admin, userId);
  if (!maySeeShortage(viewer.junior)) return ok({ shortages: [] });
  const clubs = await clubsInScope(admin, viewer, scope);
  let q = admin.from('community_shortages').select('id, club_id, posted_by, play_at, format, need, place, note').eq('status', 'open').gt('play_at', new Date().toISOString()).order('play_at').limit(60);
  if (clubs !== 'all') q = q.in('club_id', clubs.size ? [...clubs.keys()] : ['00000000-0000-0000-0000-000000000000']);
  const { data, error } = await q;
  if (error) return no('Could not load games.');
  const blocked = await blockedIds(admin, userId);
  const rows = (data ?? []).filter((s) => !blocked.has(s.posted_by as string))
    .filter((s) => {
      if (within === undefined || clubs === 'all') return true;
      const miles = clubs.get(s.club_id as string)?.miles ?? null;
      return miles !== null && miles <= within;
    });
  const ids = rows.map((s) => s.id as string);
  const [{ data: replies }, { data: clubRows }] = await Promise.all([
    ids.length ? admin.from('community_shortage_replies').select('shortage_id, user_id').in('shortage_id', ids) : Promise.resolve({ data: [] as Array<{ shortage_id: string; user_id: string }> }),
    ids.length ? admin.from('clubs').select('id, name').in('id', [...new Set(rows.map((s) => s.club_id as string))]) : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ]);
  const clubName = new Map((clubRows ?? []).map((c) => [c.id as string, c.name as string]));
  return ok({ shortages: rows.map((s) => {
    const mine = s.posted_by === userId;
    const mineReplies = (replies ?? []).filter((r) => r.shortage_id === s.id);
    const miles = clubs !== 'all' ? clubs.get(s.club_id as string)?.miles ?? null : null;
    const replied = mineReplies.some((r) => r.user_id === userId);
    return {
      id: s.id as string, club: clubName.get(s.club_id as string) ?? 'Club', clubId: s.club_id as string, format: s.format as ShortageFormat,
      playAt: s.play_at as string, need: s.need as number, place: s.place as string, note: (s.note as string | null) ?? '',
      distance: miles !== null && miles > 0 ? roughDistance(miles) : null,
      mine, replied, replies: mine ? mineReplies.length : 0, canReply: !mine && !replied,
    };
  }) });
}

export type NewShortage = { clubId: unknown; playAt: unknown; format: unknown; need: unknown; place: unknown; note: unknown };

export async function postShortage(userId: string, input: NewShortage): Promise<Result<{ id: string; held: boolean }>> {
  if (typeof input.clubId !== 'string' || typeof input.place !== 'string' || typeof input.playAt !== 'string') return no('Fill in the club, place and time.');
  if (!isShortageFormat(input.format)) return no('Choose the kind of game.');
  if (typeof input.need !== 'number' || !Number.isInteger(input.need) || input.need < 1 || input.need > SHORTAGE_NEED_MAX) return no(`Say how many players you need, 1 to ${SHORTAGE_NEED_MAX}.`);
  const when = new Date(input.playAt);
  if (Number.isNaN(when.getTime())) return no('Pick a date and time.');
  const w = checkShortageWhen(when); if (!w.ok) return no(w.reason);
  const p = checkPlace(input.place); if (!p.ok) return no(p.reason);
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 300) : '';

  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const viewer = await getViewer(admin, userId);
  if (!mayPostShortage(viewer.junior, await isStaffAt(admin, userId, input.clubId))) return no('Only a coach or club admin can post a game for their club.');
  const check = await checkContent([note, input.place].filter(Boolean).join('\n'), { place: 'public', authorJunior: false, readerJunior: true }, 500);
  // A plain rule refusal is not stored. If the AI check is busy or unsure the game is saved as held for ShiftUp staff.
  if (check.status === 'held' && !check.held) return no(check.tell ?? 'That was not posted.');
  const queued = check.status === 'held';
  const { data, error } = await admin.from('community_shortages').insert({
    club_id: input.clubId, posted_by: userId, play_at: when.toISOString(), format: input.format, need: input.need, place: input.place.trim(), note: note || null,
    status: queued ? 'held' : 'open', held_reason: queued ? check.tell : null,
  }).select('id').maybeSingle();
  if (error || !data) return no('Could not post this.');
  return ok({ id: data.id as string, held: queued });
}

/** "I can play". Tells the poster who you are, and nothing else about you. */
export async function replyToShortage(userId: string, shortageId: unknown, on: boolean): Promise<Result<{ replied: boolean }>> {
  if (typeof shortageId !== 'string') return no('Game not found.');
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  if (!on) { await admin.from('community_shortage_replies').delete().eq('shortage_id', shortageId).eq('user_id', userId); return ok({ replied: false }); }
  const { data: s } = await admin.from('community_shortages').select('id, club_id, posted_by, play_at, status').eq('id', shortageId).maybeSingle();
  if (!s || s.status !== 'open' || new Date(s.play_at as string).getTime() <= Date.now()) return no('Game not found.');
  const [viewer, blocked] = await Promise.all([getViewer(admin, userId), blockedIds(admin, userId)]);
  if (!maySeeShortage(viewer.junior) || blocked.has(s.posted_by as string)) return no('Game not found.');
  if (s.posted_by === userId) return no('This is your own post.');
  const { error } = await admin.from('community_shortage_replies').upsert({ shortage_id: shortageId, user_id: userId });
  if (error) return no('Could not send that.');
  const who = await people(admin, [userId]);
  const me = who.get(userId);
  await notify(admin, s.posted_by as string, { kind: 'shortage_reply', title: `${me?.name ?? 'Someone'} can play`, body: me?.clubName ?? undefined, data: { shortageId, userId } });
  return ok({ replied: true });
}

export type ShortageReply = { id: string; name: string; club: string | null; roles: string[] };

/** The poster sees who has said they can play. Nobody else does. */
export async function getReplies(userId: string, shortageId: string): Promise<Result<ShortageReply[]>> {
  const admin = createAdminClient();
  const hold = await holdFor(admin, userId);
  if (hold) return no(hold);
  const { data: s } = await admin.from('community_shortages').select('posted_by').eq('id', shortageId).maybeSingle();
  if (!s || s.posted_by !== userId) return no('Game not found.');
  const { data } = await admin.from('community_shortage_replies').select('user_id').eq('shortage_id', shortageId);
  const who = await people(admin, (data ?? []).map((r) => r.user_id as string));
  return ok([...who.values()].filter((p) => !p.junior).map((p) => ({ id: p.id, name: p.name, club: p.clubName, roles: p.roles })));
}

export async function closeShortage(userId: string, shortageId: unknown, status: 'filled' | 'cancelled'): Promise<Result<{ closed: true }>> {
  if (typeof shortageId !== 'string') return no('Game not found.');
  const { data } = await createAdminClient().from('community_shortages').update({ status }).eq('id', shortageId).eq('posted_by', userId).eq('status', 'open').select('id');
  return (data ?? []).length ? ok({ closed: true }) : no('Game not found.');
}
