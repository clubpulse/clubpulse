// ClubPulse staff review of reports and held content. Service-role only; callers must already have
// passed requireAdmin().

import { createAdminClient } from '@/lib/supabase/admin';
import { people, ok, no, type Result } from './service';

export type ReviewKind = 'post' | 'comment' | 'message' | 'profile' | 'session' | 'shortage';
export type ReviewItem = {
  reportId: string | null; kind: ReviewKind; targetId: string; text: string; reason: string | null;
  authorName: string; createdAt: string; status: string;
};

const TABLE = { post: 'community_posts', comment: 'community_comments', message: 'community_messages', session: 'community_sessions', shortage: 'community_shortages' } as const;
const AUTHOR = { post: 'author_id', comment: 'author_id', message: 'sender_id', session: 'host_id', shortage: 'posted_by' } as const;
// Sessions and games are "open" when allowed; posts, comments and messages are "live"
const LIVE_STATUS = { post: 'live', comment: 'live', message: 'live', session: 'open', shortage: 'open' } as const;

async function describe(kind: ReviewKind, targetId: string): Promise<{ text: string; authorId: string | null; status: string } | null> {
  const admin = createAdminClient();
  if (kind === 'profile') {
    const { data } = await admin.from('community_profiles').select('user_id, headline, about').eq('user_id', targetId).maybeSingle();
    return data ? { text: [data.headline, data.about].filter(Boolean).join(' — '), authorId: targetId, status: 'live' } : null;
  }
  if (kind === 'session' || kind === 'shortage') {
    const cols = kind === 'session' ? 'title, note, place, status, host_id' : 'note, place, status, posted_by';
    const { data: s } = await admin.from(TABLE[kind]).select(cols).eq('id', targetId).maybeSingle();
    const r = s as unknown as Record<string, string> | null;
    return r ? { text: [r.title, r.note, r.place].filter(Boolean).join('\n'), authorId: r[AUTHOR[kind]], status: r.status } : null;
  }
  const { data } = await admin.from(TABLE[kind]).select(`body, status, ${AUTHOR[kind]}`).eq('id', targetId).maybeSingle();
  const row = data as unknown as Record<string, string> | null;
  return row ? { text: row.body, authorId: row[AUTHOR[kind]], status: row.status } : null;
}

/** Open reports first, then content the safety check held. Oldest first, so nothing waits behind newer items. */
export async function getReviewQueue(): Promise<ReviewItem[]> {
  const admin = createAdminClient();
  const [{ data: reports }, { data: heldPosts }, { data: heldComments }, { data: heldMessages }, { data: heldSessions }, { data: heldShortages }] = await Promise.all([
    admin.from('community_reports').select('id, kind, target_id, reason, created_at').eq('handled', false).order('created_at').limit(100),
    admin.from('community_posts').select('id, author_id, body, held_reason, created_at').eq('status', 'held').order('created_at').limit(100),
    admin.from('community_comments').select('id, author_id, body, held_reason, created_at').eq('status', 'held').order('created_at').limit(100),
    admin.from('community_messages').select('id, sender_id, body, held_reason, created_at').eq('status', 'held').order('created_at').limit(100),
    admin.from('community_sessions').select('id, host_id, title, note, place, held_reason, created_at').eq('status', 'held').order('created_at').limit(100),
    admin.from('community_shortages').select('id, posted_by, note, place, held_reason, created_at').eq('status', 'held').order('created_at').limit(100),
  ]);
  const items: ReviewItem[] = [];
  for (const r of reports ?? []) {
    const d = await describe(r.kind as ReviewKind, r.target_id as string);
    items.push({ reportId: r.id as string, kind: r.kind as ReviewKind, targetId: r.target_id as string, text: d?.text ?? '(already removed)', reason: (r.reason as string | null) ?? null, authorName: d?.authorId ?? '', createdAt: r.created_at as string, status: d?.status ?? 'removed' });
  }
  for (const p of heldPosts ?? []) items.push({ reportId: null, kind: 'post', targetId: p.id as string, text: p.body as string, reason: (p.held_reason as string | null) ?? 'Held by the safety check', authorName: p.author_id as string, createdAt: p.created_at as string, status: 'held' });
  for (const c of heldComments ?? []) items.push({ reportId: null, kind: 'comment', targetId: c.id as string, text: c.body as string, reason: (c.held_reason as string | null) ?? 'Held by the safety check', authorName: c.author_id as string, createdAt: c.created_at as string, status: 'held' });
  for (const m of heldMessages ?? []) items.push({ reportId: null, kind: 'message', targetId: m.id as string, text: m.body as string, reason: (m.held_reason as string | null) ?? 'Held by the safety check', authorName: m.sender_id as string, createdAt: m.created_at as string, status: 'held' });
  for (const s of heldSessions ?? []) items.push({ reportId: null, kind: 'session', targetId: s.id as string, text: [s.title, s.note, s.place].filter(Boolean).join('\n'), reason: (s.held_reason as string | null) ?? 'The safety check could not clear this', authorName: s.host_id as string, createdAt: s.created_at as string, status: 'held' });
  for (const g of heldShortages ?? []) items.push({ reportId: null, kind: 'shortage', targetId: g.id as string, text: [g.note, g.place].filter(Boolean).join('\n'), reason: (g.held_reason as string | null) ?? 'The safety check could not clear this', authorName: g.posted_by as string, createdAt: g.created_at as string, status: 'held' });
  const who = await people(admin, [...new Set(items.map((i) => i.authorName).filter(Boolean))]);
  return items.map((i) => ({ ...i, authorName: who.get(i.authorName)?.name ?? 'Member' })).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/**
 * allow   – put held content live (or keep reported content up) and close the report
 * remove  – take the content down and close the report
 * handled – close the report without changing the content
 */
export async function resolveItem(staffId: string, input: { action: unknown; kind: unknown; targetId: unknown; reportId?: unknown }): Promise<Result<{ done: true }>> {
  const { action, kind, targetId } = input;
  if (action !== 'allow' && action !== 'remove' && action !== 'handled') return no('Unknown action.');
  if (kind !== 'post' && kind !== 'comment' && kind !== 'message' && kind !== 'profile' && kind !== 'session' && kind !== 'shortage') return no('Unknown item.');
  if (typeof targetId !== 'string') return no('Unknown item.');
  const reportId = typeof input.reportId === 'string' ? input.reportId : null;
  const admin = createAdminClient();

  if (kind !== 'profile' && action !== 'handled') {
    let q = admin.from(TABLE[kind]).update({ status: action === 'allow' ? LIVE_STATUS[kind] : 'removed' }).eq('id', targetId);
    // Allowing a session or game only ever releases one that is waiting, never one the host has since cancelled
    if (action === 'allow' && (kind === 'session' || kind === 'shortage')) q = q.eq('status', 'held');
    const { error } = await q;
    if (error) return no('Could not update that item.');
  }
  if (kind === 'profile' && action === 'remove') {
    // A profile is cleared, not deleted
    await admin.from('community_profiles').update({ headline: null, about: null }).eq('user_id', targetId);
  }
  // Closing a report also closes the other open reports on the same thing
  const close = admin.from('community_reports').update({ handled: true }).eq('kind', kind).eq('target_id', targetId).eq('handled', false);
  await close;
  await admin.from('community_moderation_events').insert({ staff_id: staffId, action, kind, target_id: targetId, report_id: reportId });
  return ok({ done: true });
}

/** A child's live posts, for their linked parent. */
export async function liveRecentPostsBy(userId: string, limit = 10): Promise<Array<{ id: string; body: string; createdAt: string }>> {
  const { data } = await createAdminClient().from('community_posts').select('id, body, created_at').eq('author_id', userId).eq('status', 'live').order('created_at', { ascending: false }).limit(limit);
  return (data ?? []).map((p) => ({ id: p.id as string, body: p.body as string, createdAt: p.created_at as string }));
}
