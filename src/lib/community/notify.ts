// In-app notifications for the Community, and the push that goes with them. A push is a nudge, never the
// only place something appears, and a failed push never fails the thing that caused it.

import type { Admin } from './service';

export type NotificationKind = 'connect_request' | 'connect_accepted' | 'parent_connection' | 'message' | 'guardian_request' | 'guardian_decision' | 'shortage_reply';
export type Notice = { kind: NotificationKind; title: string; body?: string; data?: Record<string, string> };
export type NotificationRow = { id: string; kind: NotificationKind; title: string; body: string | null; data: Record<string, string>; read: boolean; createdAt: string };

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

/** Send one push through Expo. Resolves false, never throws. */
export async function sendPush(token: string | null | undefined, notice: Pick<Notice, 'title' | 'body' | 'data'>): Promise<boolean> {
  if (!token || !/^Expo(nent)?PushToken\[.+\]$/.test(token)) return false;
  try {
    const res = await fetch(EXPO_PUSH, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title: notice.title, body: notice.body ?? '', data: notice.data ?? {}, sound: 'default' }),
    });
    return res.ok;
  } catch { return false; }
}

/** Save the notification, then push it. Never throws. */
export async function notify(admin: Admin, userId: string, notice: Notice): Promise<void> {
  try {
    await admin.from('community_notifications').insert({ user_id: userId, kind: notice.kind, title: notice.title, body: notice.body ?? null, data: notice.data ?? {} });
    const { data } = await admin.from('profiles').select('push_token').eq('id', userId).maybeSingle();
    await sendPush((data?.push_token as string | null) ?? null, notice);
  } catch { /* a notification must never break the action that caused it */ }
}

export async function getNotifications(admin: Admin, userId: string): Promise<{ items: NotificationRow[]; unread: number }> {
  const { data } = await admin.from('community_notifications').select('id, kind, title, body, data, read_at, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  const items = (data ?? []).map((n) => ({
    id: n.id as string, kind: n.kind as NotificationKind, title: n.title as string, body: (n.body as string | null) ?? null,
    data: (n.data as Record<string, string> | null) ?? {}, read: n.read_at !== null && n.read_at !== undefined, createdAt: n.created_at as string,
  }));
  return { items, unread: items.filter((i) => !i.read).length };
}

/** Mark one notification read, or all of them when no id is given. Only ever the caller's own. */
export async function markRead(admin: Admin, userId: string, id?: string): Promise<void> {
  let q = admin.from('community_notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
  if (id) q = q.eq('id', id);
  await q;
}
