import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/resend';
import { activeLeadEmails } from './lead';
import { purgeAlert, safeguardingLeadEmail } from './alert';

type Admin = SupabaseClient;

export const PURGE_REASON = 'under_13_no_guardian_confirmation_after_14_days';

/** At most this many unsent alerts are retried on one run. */
const RETRY_LIMIT = 50;

/**
 * Writes the lasting record before the account is deleted. The record keeps the id and the clubs, nothing else.
 * Returns the record id, or null when it could not be stored. A missing record means the account must not be deleted.
 */
export async function recordPurge(admin: Admin, userId: string): Promise<{ id: string; clubIds: string[] } | null> {
  const { data: memberships, error: memberError } = await admin.from('club_members').select('club_id').eq('user_id', userId);
  if (memberError) {
    console.error('[age-verification] could not read clubs before a purge');
    return null;
  }
  const clubIds = [...new Set((memberships ?? []).map((row) => row.club_id as string))];
  const { data: existing, error: existingError } = await admin.from('age_verification_purges').select('id, club_ids').eq('purged_user_id', userId).maybeSingle();
  if (existingError) {
    console.error('[age-verification] could not read the purge record');
    return null;
  }
  if (existing) return { id: existing.id as string, clubIds: ((existing.club_ids as string[] | null) ?? clubIds) };
  const id = randomUUID();
  const { error: insertError } = await admin.from('age_verification_purges').insert({ id, purged_user_id: userId, club_ids: clubIds, reason: PURGE_REASON });
  if (insertError) {
    console.error('[age-verification] could not store the purge record');
    return null;
  }
  return { id, clubIds };
}

export async function markPurged(admin: Admin, recordId: string, at: Date): Promise<boolean> {
  const { error } = await admin.from('age_verification_purges').update({ purged_at: at.toISOString() }).eq('id', recordId);
  if (error) console.error('[age-verification] could not mark the purge record');
  return !error;
}

/**
 * Welfare officers of the clubs the person belonged to. When any of those clubs has no welfare officer, or the
 * person had no club, SAFEGUARDING_LEAD_EMAIL is added so the alert never goes nowhere.
 */
export async function purgeRecipients(admin: Admin, clubIds: string[]): Promise<{ emails: string[] } | { error: string }> {
  const lead = safeguardingLeadEmail();
  if (clubIds.length === 0) return { emails: [lead] };
  const { data: officers, error } = await admin.from('club_members').select('club_id, user_id').in('club_id', clubIds).eq('is_active', true).eq('role', 'welfare_officer');
  if (error) return { error: 'could not look up welfare officers' };
  const covered = new Set((officers ?? []).map((row) => row.club_id as string));
  const emails = new Set<string>();
  if (clubIds.some((id) => !covered.has(id))) {
    // No welfare officer at one of the clubs: the active leads are told. The environment address is an extra copy only.
    emails.add(lead);
    const leads = await activeLeadEmails(admin);
    if ('error' in leads) return { error: leads.error };
    for (const email of leads.emails) emails.add(email);
  }
  const ids = (officers ?? []).map((row) => row.user_id as string);
  if (ids.length > 0) {
    const { data: profiles, error: profileError } = await admin.from('profiles').select('email').in('id', ids);
    if (profileError) return { error: 'could not read welfare officer email' };
    for (const profile of profiles ?? []) if (profile.email) emails.add(profile.email as string);
  }
  if (emails.size === 0) emails.add(lead);
  return { emails: [...emails] };
}

/** Sends every purge alert that has not gone out yet, including earlier failures. Returns how many were sent. */
export async function sendPurgeAlerts(admin: Admin): Promise<{ sent: number; failed: number }> {
  const { data: pending, error } = await admin.from('age_verification_purges')
    .select('id, club_ids, purged_at, alert_sent_at, alert_attempts').is('alert_sent_at', null).limit(RETRY_LIMIT);
  if (error) {
    console.error('[age-verification] could not read unsent purge alerts');
    return { sent: 0, failed: 0 };
  }
  let sent = 0;
  let failed = 0;
  for (const row of (pending ?? []).filter((r) => !!r.purged_at)) {
    const recipients = await purgeRecipients(admin, (row.club_ids as string[] | null) ?? []);
    let ok = false;
    if ('emails' in recipients) {
      const clubIds = (row.club_ids as string[] | null) ?? [];
      const message = purgeAlert({ recordId: row.id as string, purgedAt: row.purged_at as string, clubs: await clubsForAlert(admin, clubIds) });
      const results = await Promise.all(recipients.emails.map((to) => sendEmail({ to, subject: message.subject, text: message.text })));
      ok = results.every(Boolean);
    }
    if (ok) {
      await admin.from('age_verification_purges').update({ alert_sent_at: new Date().toISOString() }).eq('id', row.id);
      sent += 1;
    } else {
      await admin.from('age_verification_purges').update({ alert_attempts: ((row.alert_attempts as number | null) ?? 0) + 1 }).eq('id', row.id);
      console.error('[age-verification] purge alert was not sent', { recordId: row.id });
      failed += 1;
    }
  }
  return { sent, failed };
}

/** Club names for the alert, and which of them have no welfare officer, so a lead knows the follow-up is theirs. */
async function clubsForAlert(admin: Admin, clubIds: string[]): Promise<Array<{ name: string; noWelfareOfficer: boolean }>> {
  if (clubIds.length === 0) return [];
  const [{ data: clubs }, { data: officers }] = await Promise.all([
    admin.from('clubs').select('id, name').in('id', clubIds),
    admin.from('club_members').select('club_id').in('club_id', clubIds).eq('is_active', true).eq('role', 'welfare_officer'),
  ]);
  const covered = new Set((officers ?? []).map((r) => r.club_id as string));
  const names = new Map((clubs ?? []).map((c) => [c.id as string, c.name as string]));
  return clubIds.map((id) => ({ name: names.get(id) ?? 'A club', noWelfareOfficer: !covered.has(id) }));
}
