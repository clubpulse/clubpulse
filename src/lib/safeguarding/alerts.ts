// Safeguarding alerts. When a report is filed or the safety check holds an item, the named safeguarding lead and
// deputy are emailed (and sent a push where they have a token) straight away. Server-only: service role.
//
//  - One event is one alert (event_key is unique) and one delivery per recipient per channel.
//  - The message never carries the reported content. For a junior item it does not carry the reporter's own words either.
//  - A failed delivery is retried with a growing delay, from the same request and from the sweep in
//    /api/cron/safeguarding-alerts. Nothing here ever throws into the action that caused it.

import { randomUUID } from 'crypto';
import type { Admin } from '@/lib/community/service';
import { sendEmail } from '@/lib/email/resend';
import { sendPush } from '@/lib/community/notify';
import { APP_URL } from '@/lib/share-urls';

export const MAX_ATTEMPTS = 10;
const LEASE_MS = 5 * 60 * 1000;
const QUEUE_PATH = '/admin/community/reports';

export type AlertSource = 'report' | 'held';
export type AlertEvent = { source: AlertSource; kind: string; targetId: string; junior: boolean; reportId?: string; reason?: string | null };
export type AlertRow = { id: string; source: AlertSource; item_kind: string; target_id: string; junior: boolean; reason: string | null; link: string };

const KIND_LABEL: Record<string, string> = { post: 'post', comment: 'comment', message: 'private message', profile: 'profile', session: 'session', shortage: 'game' };
const oneLine = (s: string, n: number) => s.replace(/\s+/g, ' ').trim().slice(0, n);

/** Minutes to wait after the nth failed attempt: 1, 2, 4, 8, then 15. */
export const retryDelayMinutes = (attempt: number) => Math.min(2 ** Math.max(attempt - 1, 0), 15);

export const alertLink = (kind: string, targetId: string) => `${APP_URL}${QUEUE_PATH}#item-${kind}-${targetId}`;

export function alertMessage(a: Pick<AlertRow, 'source' | 'item_kind' | 'junior' | 'reason' | 'link'>) {
  const what = KIND_LABEL[a.item_kind] ?? a.item_kind;
  const how = a.source === 'report' ? `A ${what} has been reported` : `A ${what} has been held by the safety check`;
  const subject = `SHIFTUP safeguarding: ${a.source === 'report' ? 'report' : 'held item'} (${what})${a.junior ? ' – junior' : ''}`;
  const text = [
    `${how} and needs a safeguarding review.`,
    '',
    `Item: ${what}`,
    `Involves a junior: ${a.junior ? 'yes' : 'no'}`,
    ...(a.reason ? [`Reason: ${a.reason}`] : a.source === 'report' ? ['Reason: not included in this message, see the queue'] : []),
    '',
    `Moderation queue: ${a.link}`,
    '',
    'This message does not include the content itself. If anyone is in immediate danger, call 999 first.',
  ].join('\n');
  return { subject, text, push: { title: 'Safeguarding review needed', body: `${how}${a.junior ? ' (junior)' : ''}. Open the moderation queue.` } };
}

/** Is the thing being reported a junior's, or in a junior band? When unsure, yes: it only makes the alert less detailed. */
export async function targetIsJunior(admin: Admin, kind: string, targetId: string): Promise<boolean> {
  try {
    const { people } = await import('@/lib/community/service');
    if (kind === 'session') {
      const { data } = await admin.from('community_sessions').select('age_band, host_id').eq('id', targetId).maybeSingle();
      if (!data) return true;
      if (data.age_band === 'junior') return true;
      return !!(await people(admin, [data.host_id as string])).get(data.host_id as string)?.junior;
    }
    const spec = ({ post: ['community_posts', 'author_id'], comment: ['community_comments', 'author_id'], message: ['community_messages', 'sender_id'], shortage: ['community_shortages', 'posted_by'] } as const)[kind as 'post'];
    let authorId: string | null = kind === 'profile' ? targetId : null;
    if (spec) {
      const { data } = await admin.from(spec[0]).select(spec[1]).eq('id', targetId).maybeSingle();
      authorId = ((data as unknown as Record<string, string> | null)?.[spec[1]]) ?? null;
    }
    if (!authorId) return true;
    const person = (await people(admin, [authorId])).get(authorId);
    return person ? person.junior : true;
  } catch { return true; }
}

/**
 * Record the alert and its deliveries, then start sending. Safe to call twice for the same event: the second call
 * does nothing. Never throws.
 */
export async function raiseAlert(admin: Admin, ev: AlertEvent): Promise<void> {
  try {
    const eventKey = ev.source === 'report' ? `report:${ev.reportId ?? ev.targetId}` : `held:${ev.kind}:${ev.targetId}`;
    const { data: existing } = await admin.from('safeguarding_alerts').select('id').eq('event_key', eventKey).maybeSingle();
    if (existing) return;
    const reason = ev.junior && ev.source === 'report' ? null : ev.reason ? oneLine(ev.reason, 200) : null;
    const id = randomUUID();
    const { error } = await admin.from('safeguarding_alerts').insert({
      id, event_key: eventKey, source: ev.source, item_kind: ev.kind, target_id: ev.targetId, junior: ev.junior, reason, link: alertLink(ev.kind, ev.targetId),
    });
    if (error) return; // a unique violation means another request raised it first
    const { data: contacts } = await admin.from('safeguarding_contacts').select('id, email, user_id').eq('active', true);
    const rows: Array<{ alert_id: string; contact_id: string; channel: 'email' | 'push' }> = [];
    for (const c of contacts ?? []) {
      if (c.email) rows.push({ alert_id: id, contact_id: c.id as string, channel: 'email' });
      if (c.user_id) rows.push({ alert_id: id, contact_id: c.id as string, channel: 'push' });
    }
    if (rows.length === 0) { console.error('[safeguarding] alert raised but no active safeguarding contact is configured:', eventKey); return; }
    await admin.from('safeguarding_alert_deliveries').insert(rows);
    await startDelivery(admin);
  } catch (err) { console.error('[safeguarding] could not raise alert:', err); }
}

/** Send after the response where Next allows it, otherwise wait for it. */
async function startDelivery(admin: Admin) {
  try {
    const { after } = await import('next/server');
    after(() => deliverDue(admin).then(() => undefined));
  } catch { await deliverDue(admin); }
}

/** Send every delivery that is due. Returns how many went out. Also the retry sweep. */
export async function deliverDue(admin: Admin, now: Date = new Date()): Promise<number> {
  let sent = 0;
  try {
    const { data: due } = await admin.from('safeguarding_alert_deliveries').select('id, alert_id, contact_id, channel, attempts')
      .in('status', ['pending', 'failed']).lt('attempts', MAX_ATTEMPTS).lte('next_attempt_at', now.toISOString()).order('next_attempt_at').limit(50);
    if (!due || due.length === 0) return 0;
    const [{ data: alerts }, { data: contacts }] = await Promise.all([
      admin.from('safeguarding_alerts').select('id, source, item_kind, target_id, junior, reason, link').in('id', [...new Set(due.map((d) => d.alert_id as string))]),
      admin.from('safeguarding_contacts').select('id, email, user_id').in('id', [...new Set(due.map((d) => d.contact_id as string))]),
    ]);
    const alertById = new Map((alerts ?? []).map((a) => [a.id as string, a as unknown as AlertRow]));
    const contactById = new Map((contacts ?? []).map((c) => [c.id as string, c]));
    for (const d of due) {
      const attempts = d.attempts as number;
      // Claim it, so the request that raised it and the sweep never both send the same one
      const { data: claimed } = await admin.from('safeguarding_alert_deliveries')
        .update({ attempts: attempts + 1, next_attempt_at: new Date(now.getTime() + LEASE_MS).toISOString() })
        .eq('id', d.id).eq('attempts', attempts).in('status', ['pending', 'failed']).select('id');
      if (!claimed || claimed.length === 0) continue;
      const alert = alertById.get(d.alert_id as string); const contact = contactById.get(d.contact_id as string);
      const fail = (why: string) => admin.from('safeguarding_alert_deliveries').update({
        status: 'failed', last_error: why, next_attempt_at: new Date(now.getTime() + retryDelayMinutes(attempts + 1) * 60000).toISOString(),
      }).eq('id', d.id);
      if (!alert || !contact) { await admin.from('safeguarding_alert_deliveries').update({ status: 'skipped', last_error: 'alert or contact is gone' }).eq('id', d.id); continue; }
      const msg = alertMessage(alert);
      let ok = false; let why = '';
      if (d.channel === 'email') {
        ok = contact.email ? await sendEmail({ to: contact.email as string, subject: msg.subject, text: msg.text }) : false;
        why = contact.email ? 'email not sent' : 'no email address';
      } else {
        const { data: prof } = await admin.from('profiles').select('push_token').eq('id', contact.user_id as string).maybeSingle();
        const token = (prof?.push_token as string | null) ?? null;
        if (!token) { await admin.from('safeguarding_alert_deliveries').update({ status: 'skipped', last_error: 'no push token' }).eq('id', d.id); continue; }
        ok = await sendPush(token, { title: msg.push.title, body: msg.push.body, data: { link: alert.link } });
        why = 'push not sent';
      }
      if (ok) { await admin.from('safeguarding_alert_deliveries').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('id', d.id); sent++; }
      else await fail(why);
    }
  } catch (err) { console.error('[safeguarding] delivery sweep failed:', err); }
  return sent;
}

/** For the moderation queue: is anyone set up to be told, and has anything given up? */
export async function alertHealth(admin: Admin): Promise<{ contacts: number; failed: number }> {
  const [{ data: contacts }, { data: failed }] = await Promise.all([
    admin.from('safeguarding_contacts').select('id').eq('active', true),
    admin.from('safeguarding_alert_deliveries').select('id').eq('status', 'failed'),
  ]);
  return { contacts: contacts?.length ?? 0, failed: failed?.length ?? 0 };
}
