// Safeguarding alerts: a report or a held item emails (and pushes to) the lead and deputy once each, never carries the
// reported content, retries on failure, and is logged with sent_at.
import fs from 'fs';
import path from 'path';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
const db: Record<string, Row[]> = {};
function from(table: string) {
  const filters: Array<(r: Row) => boolean> = [];
  let op = 'select'; let payload: any; let single = false; let returning = false; let lim = Infinity; let orderKey: string | null = null;
  const run = () => {
    const rows = (db[table] ??= []);
    if (op === 'insert') {
      const list: Row[] = Array.isArray(payload) ? payload : [payload];
      for (const p of list) {
        const row: Row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...(table === 'safeguarding_alert_deliveries' ? { status: 'pending', attempts: 0, next_attempt_at: new Date().toISOString(), sent_at: null, last_error: null } : {}), ...p };
        const dup = rows.some((r) => (table === 'safeguarding_alerts' && r.event_key === row.event_key)
          || (table === 'safeguarding_alert_deliveries' && r.alert_id === row.alert_id && r.contact_id === row.contact_id && r.channel === row.channel));
        if (dup) return { data: null, error: { code: '23505' } };
        rows.push(row);
      }
      return { data: null, error: null };
    }
    const hit = rows.filter((r) => filters.every((f) => f(r)));
    if (op === 'update') { for (const r of hit) Object.assign(r, payload); return { data: returning ? hit.map((r) => ({ id: r.id })) : null, error: null }; }
    let out = [...hit];
    if (orderKey) out.sort((a, b) => String(a[orderKey!]).localeCompare(String(b[orderKey!])));
    out = out.slice(0, lim).map((r) => ({ ...r }));
    return { data: single ? out[0] ?? null : out, error: null };
  };
  const c: any = {
    select: () => { returning = true; return c; },
    eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return c; },
    in: (k: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[k])); return c; },
    lt: (k: string, v: any) => { filters.push((r) => r[k] < v); return c; },
    lte: (k: string, v: any) => { filters.push((r) => String(r[k]) <= String(v)); return c; },
    order: (k: string) => { orderKey = k; return c; },
    limit: (n: number) => { lim = n; return c; },
    maybeSingle: () => { single = true; return c; },
    insert: (p: unknown) => { op = 'insert'; payload = p; return c; },
    update: (p: unknown) => { op = 'update'; payload = p; return c; },
    then: (res: (v: unknown) => unknown) => res(run()),
  };
  return c;
}

const sendEmail = jest.fn(async (...args: unknown[]) => { void args; return true; });
const sendPush = jest.fn(async (...args: unknown[]) => { void args; return true; });
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ from }) }));
jest.mock('@/lib/email/resend', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
jest.mock('@/lib/community/notify', () => ({ sendPush: (...a: unknown[]) => sendPush(...a), notify: async () => undefined }));
jest.mock('@/lib/community/moderation', () => ({ checkContent: async () => ({ status: 'live' }) }));
let junior = false;
jest.mock('@/lib/community/service', () => ({
  ...jest.requireActual('@/lib/community/service'),
  people: async (_a: unknown, ids: string[]) => new Map(ids.map((id) => [id, { id, junior }])),
}));

import { report } from '@/lib/community/service';
import { raiseAlert, deliverDue, alertMessage, retryDelayMinutes, alertHealth } from '@/lib/safeguarding/alerts';
import { GET as cron } from '@/app/api/cron/safeguarding-alerts/route';

const admin = { from } as never;
const emailsTo = (addr: string) => sendEmail.mock.calls.filter((c) => (c[0] as { to: string }).to === addr);
const alerts = () => db.safeguarding_alerts;
const deliveries = () => db.safeguarding_alert_deliveries;

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  Object.assign(db, {
    safeguarding_contacts: [
      { id: 'lead', role: 'lead', name: 'Ishwar Suresh', email: 'lead@example.test', user_id: null, active: true },
      { id: 'dep', role: 'deputy', name: 'Deputy', email: 'deputy@example.test', user_id: 'dep-user', active: true },
    ],
    safeguarding_alerts: [], safeguarding_alert_deliveries: [], community_reports: [],
    community_posts: [{ id: 'p1', author_id: 'author', body: 'THE REPORTED WORDS', status: 'live' }],
    community_sessions: [{ id: 's1', host_id: 'host', age_band: 'junior', title: 'Under-12 nets', status: 'open' }],
    profiles: [{ id: 'dep-user', push_token: 'ExponentPushToken[abc]' }],
  });
  junior = false;
  sendEmail.mockClear().mockResolvedValue(true); sendPush.mockClear().mockResolvedValue(true);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('a report raises exactly one alert per recipient', () => {
  it('emails the lead and the deputy once each, pushes the deputy once, and logs sent_at', async () => {
    const r = await report('member', { kind: 'post', targetId: 'p1', reason: 'This is abusive' });
    expect(r.success).toBe(true);
    expect(alerts()).toHaveLength(1);
    expect(emailsTo('lead@example.test')).toHaveLength(1);
    expect(emailsTo('deputy@example.test')).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendPush).toHaveBeenCalledTimes(1);
    expect(sendPush.mock.calls[0][0]).toBe('ExponentPushToken[abc]');
    expect(deliveries()).toHaveLength(3);
    for (const d of deliveries()) { expect(d.status).toBe('sent'); expect(d.sent_at).toEqual(expect.any(String)); }
  });

  it('gives item type, reason and a link to the queue, and never the reported content', async () => {
    await report('member', { kind: 'post', targetId: 'p1', reason: 'This is abusive' });
    const { subject, text } = sendEmail.mock.calls[0][0] as { subject: string; text: string };
    expect(subject).toContain('post');
    expect(text).toContain('Item: post');
    expect(text).toContain('Reason: This is abusive');
    expect(text).toContain('/admin/community/reports#item-post-p1');
    expect(text).not.toContain('THE REPORTED WORDS');
    expect(JSON.stringify(sendPush.mock.calls[0])).not.toContain('THE REPORTED WORDS');
  });

  it('for a junior item also leaves out what the reporter wrote', async () => {
    const r = await report('member', { kind: 'session', targetId: 's1', reason: 'REPORTER FREE TEXT' });
    expect(r.success).toBe(true);
    expect(alerts()[0]).toMatchObject({ junior: true, reason: null });
    const text = (sendEmail.mock.calls[0][0] as { text: string }).text;
    expect(text).toContain('Involves a junior: yes');
    expect(text).not.toContain('REPORTER FREE TEXT');
    expect(text).not.toContain('Under-12 nets');
    expect(text).toContain('/admin/community/reports#item-session-s1');
  });

  it('treats an item it cannot look up as a junior one', async () => {
    await report('member', { kind: 'post', targetId: 'missing', reason: 'x' });
    expect(alerts()[0].junior).toBe(true);
  });

  it('a second raise for the same event adds nothing and sends nothing more', async () => {
    const ev = { source: 'held' as const, kind: 'post', targetId: 'p1', junior: false, reason: 'Held for review' };
    await raiseAlert(admin, ev); await raiseAlert(admin, ev);
    expect(alerts()).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});

describe('held items', () => {
  it('alerts on a held item without its content', async () => {
    await raiseAlert(admin, { source: 'held', kind: 'message', targetId: 'm1', junior: true, reason: 'The safety check is busy. ClubPulse will look at this.' });
    const text = (sendEmail.mock.calls[0][0] as { text: string }).text;
    expect(text).toContain('held by the safety check');
    expect(text).toContain('Reason: The safety check is busy');
    expect(text).toContain('Involves a junior: yes');
    expect(text).toContain('private message');
  });
  it('is wired into every place an item can be held or reported', () => {
    const read = (f: string) => fs.readFileSync(path.join(__dirname, '../lib/community', f), 'utf8');
    expect((read('service.ts').match(/raiseAlert\(/g) ?? []).length).toBe(4); // post, comment, message, report
    for (const f of ['social.ts', 'sessions.ts', 'shortages.ts']) expect(read(f)).toContain('raiseAlert(');
  });
});

describe('failure and retry', () => {
  it('records a failure, waits, then sends once and logs sent_at', async () => {
    sendEmail.mockResolvedValue(false);
    await raiseAlert(admin, { source: 'held', kind: 'post', targetId: 'p1', junior: false, reason: 'Held' });
    const lead = deliveries().find((d) => d.contact_id === 'lead')!;
    expect(lead).toMatchObject({ status: 'failed', attempts: 1, sent_at: null, last_error: 'email not sent' });
    expect(new Date(lead.next_attempt_at).getTime()).toBeGreaterThan(Date.now() + 30_000);

    sendEmail.mockClear().mockResolvedValue(true);
    expect(await deliverDue(admin, new Date())).toBe(0); // not due yet, so nothing is re-sent early
    expect(sendEmail).not.toHaveBeenCalled();

    expect(await deliverDue(admin, new Date(Date.now() + 2 * 60_000))).toBe(2); // both emails
    expect(deliveries().filter((d) => d.channel === 'email').every((d) => d.status === 'sent' && d.sent_at)).toBe(true);
    expect(emailsTo('lead@example.test')).toHaveLength(1);
  });

  it('backs off 1, 2, 4, 8 then 15 minutes, and stops after the maximum', async () => {
    expect([1, 2, 3, 4, 5, 9].map(retryDelayMinutes)).toEqual([1, 2, 4, 8, 15, 15]);
    sendEmail.mockResolvedValue(false);
    await raiseAlert(admin, { source: 'held', kind: 'post', targetId: 'p1', junior: false, reason: 'Held' });
    let t = Date.now();
    for (let i = 0; i < 20; i++) { t += 20 * 60_000; await deliverDue(admin, new Date(t)); }
    expect(Math.max(...deliveries().map((d) => d.attempts))).toBe(10);
    expect(deliveries().some((d) => d.channel === 'email' && d.status === 'failed')).toBe(true);
    expect((await alertHealth(admin)).failed).toBeGreaterThan(0);
  });

  it('two sweeps at once send each delivery only once', async () => {
    sendEmail.mockResolvedValue(false);
    await raiseAlert(admin, { source: 'held', kind: 'post', targetId: 'p1', junior: false, reason: 'Held' });
    sendEmail.mockClear().mockResolvedValue(true); sendPush.mockClear();
    const later = new Date(Date.now() + 2 * 60_000);
    await Promise.all([deliverDue(admin, later), deliverDue(admin, later)]);
    expect(emailsTo('lead@example.test')).toHaveLength(1);
    expect(emailsTo('deputy@example.test')).toHaveLength(1);
  });

  it('skips a push when the contact has no token, and does nothing when nobody is set up', async () => {
    db.profiles = [{ id: 'dep-user', push_token: null }];
    await raiseAlert(admin, { source: 'held', kind: 'post', targetId: 'p1', junior: false, reason: 'Held' });
    expect(sendPush).not.toHaveBeenCalled();
    expect(deliveries().find((d) => d.channel === 'push')).toMatchObject({ status: 'skipped' });

    db.safeguarding_contacts = [];
    await expect(raiseAlert(admin, { source: 'held', kind: 'post', targetId: 'p2', junior: false, reason: 'Held' })).resolves.toBeUndefined();
    expect(deliveries().filter((d) => d.alert_id === alerts().find((a) => a.target_id === 'p2')!.id)).toHaveLength(0);
    expect((await alertHealth(admin)).contacts).toBe(0);
  });

  it('never throws into the action that caused it', async () => {
    const broken = { from: () => { throw new Error('db down'); } } as never;
    await expect(raiseAlert(broken, { source: 'report', kind: 'post', targetId: 'p1', junior: false, reportId: 'r1' })).resolves.toBeUndefined();
    await expect(deliverDue(broken)).resolves.toBe(0);
  });
});

describe('message text', () => {
  it('always tells the reader to call 999 first and that the content is not included', () => {
    const m = alertMessage({ source: 'report', item_kind: 'shortage', junior: false, reason: null, link: 'https://x/y' });
    expect(m.text).toContain('call 999');
    expect(m.text).toContain('does not include the content');
    expect(m.subject).toContain('game');
  });
});

describe('retry sweep route', () => {
  const call = (auth?: string) => cron(new Request('https://x/api/cron/safeguarding-alerts', { headers: auth ? { authorization: auth } : {} }));
  afterEach(() => { delete process.env.CRON_SECRET; });
  it('is closed when no secret is set, and to a wrong one', async () => {
    expect((await call()).status).toBe(503);
    process.env.CRON_SECRET = 's3cret';
    expect((await call()).status).toBe(401);
    expect((await call('Bearer nope')).status).toBe(401);
  });
  it('runs the sweep for the right secret', async () => {
    process.env.CRON_SECRET = 's3cret';
    const res = await call('Bearer s3cret');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 0 });
  });
});

describe('migration 025', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261122000025_safeguarding_alerts.sql'), 'utf8');
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
  it.each(['safeguarding_contacts', 'safeguarding_alerts', 'safeguarding_alert_deliveries'])('%s is server-only', (t) => {
    expect(code).toContain(`CREATE TABLE IF NOT EXISTS public.${t}`);
    expect(code).toContain(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`);
    expect(code).toContain(`REVOKE ALL ON public.${t} FROM anon, authenticated`);
  });
  it('has no client policy and is idempotent', () => {
    expect(code).not.toMatch(/CREATE POLICY/i);
    expect(code).not.toMatch(/CREATE TABLE (?!IF NOT EXISTS)/);
    expect(code).toContain('event_key TEXT NOT NULL UNIQUE');
    expect(code).toContain('UNIQUE (alert_id, contact_id, channel)');
  });
});
