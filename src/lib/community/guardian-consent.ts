// Parental confirmation for an account whose date of birth says under 13.
// The date is still only a declaration. This emails a parent or guardian a link, and records that they pressed
// the button on that page. The link is single-use, stored only as a hash, and refused after 7 days.
// A verified parent already linked to the account is treated as this confirmation by ageStatus, so this file
// does not have to send them another email.

import { createHash, randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import { ageOn, ageStatus, isPlausibleDob } from '@/lib/community/age';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN = /^[a-f0-9]{64}$/;
const HOUR_MS = 60 * 60 * 1000;

export const GUARDIAN_SENDS_PER_HOUR = 3;
export const GUARDIAN_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ConsentResult = { success: true } | { success: false; error: string };
export type ConfirmCode = 'invalid' | 'used' | 'unavailable';
export type ConfirmResult = { success: true } | { success: false; error: string; code: ConfirmCode };

type ConsentRow = {
  user_id?: string;
  guardian_email?: string;
  token_hash?: string | null;
  token_issued_at?: string | null;
  created_at?: string | null;
  confirmed_at?: string | null;
  sends_in_window?: number | null;
  send_window_started_at?: string | null;
};

const INVALID = 'This confirmation link is not valid.';
const USED = 'This confirmation link has already been used or has expired.';
const UNAVAILABLE = 'Guardian confirmation is not available yet.';
const NEED_EMAIL = 'Under 13s need a parent or guardian email address.';
const STORE_FAILED = 'The guardian confirmation could not be stored yet.';
const SEND_FAILED = 'The confirmation email could not be sent. Try again in a moment.';
const RATE_LIMITED = 'A confirmation email was sent recently. Please wait about an hour before sending another.';

function normaliseEmail(email: unknown): string | null {
  const value = typeof email === 'string' ? email.trim().toLowerCase() : '';
  return EMAIL.test(value) ? value : null;
}

function consentLink(token: string): string {
  const site = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.shiftup.club';
  return `${site}/account/guardian-consent?token=${token}`;
}

/**
 * Stores a fresh single-use token and emails it. Refuses once GUARDIAN_SENDS_PER_HOUR have gone out in the
 * current hour. A failed send does not use up that allowance, and puts the previous link back if there was one.
 * Already confirmed accounts are left as they are.
 */
export async function requestGuardianConsent(userId: string, email: unknown): Promise<ConsentResult> {
  const guardian_email = normaliseEmail(email);
  if (!guardian_email) return { success: false, error: NEED_EMAIL };
  const admin = createAdminClient();
  const { data, error: readError } = await admin.from('guardian_consents')
    .select('guardian_email, token_hash, token_issued_at, created_at, confirmed_at, sends_in_window, send_window_started_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (readError) return { success: false, error: STORE_FAILED };
  const existing = data as ConsentRow | null;
  if (existing?.confirmed_at) return { success: true };

  const now = Date.now();
  const started = existing?.send_window_started_at ? new Date(existing.send_window_started_at).getTime() : 0;
  const inWindow = Number.isFinite(started) && started > 0 && now - started < HOUR_MS;
  const count = inWindow ? Number(existing?.sends_in_window ?? 0) : 0;
  if (count >= GUARDIAN_SENDS_PER_HOUR) return { success: false, error: RATE_LIMITED };

  const token = randomBytes(32).toString('hex');
  const token_hash = createHash('sha256').update(token).digest('hex');
  const issued = new Date(now).toISOString();
  const { error: writeError } = await admin.from('guardian_consents').upsert({
    user_id: userId,
    guardian_email,
    token_hash,
    token_issued_at: issued,
  });
  if (writeError) return { success: false, error: STORE_FAILED };

  const sent = await sendEmail({
    to: guardian_email,
    subject: 'Confirm a SHIFTUP account for someone under 13',
    text: `Someone under 13 has asked you to confirm their SHIFTUP account.\n\nOpen this link if you are their parent or guardian. The account is not confirmed until you press the button on that page:\n${consentLink(token)}\n\nIf this was not you, ignore this email.`,
  });
  if (!sent) {
    if (existing?.token_hash) {
      await admin.from('guardian_consents').update({
        guardian_email: existing.guardian_email,
        token_hash: existing.token_hash,
        token_issued_at: existing.token_issued_at ?? existing.created_at ?? null,
      }).eq('user_id', userId);
    }
    return { success: false, error: SEND_FAILED };
  }

  await admin.from('guardian_consents').update({
    sends_in_window: count + 1,
    send_window_started_at: inWindow ? new Date(started).toISOString() : issued,
  }).eq('user_id', userId);
  return { success: true };
}

/**
 * The sign-up metadata path. Email confirmation often creates the profile in the database trigger, which cannot
 * send mail, so the callback asks once, here, when a guardian address was collected and nothing has been sent yet.
 * Never throws: a missed email is recovered from the dashboard prompt.
 */
export async function requestGuardianConsentFromSignup(user: { id: string; user_metadata?: unknown }): Promise<void> {
  try {
    const meta = (user.user_metadata ?? {}) as { date_of_birth?: unknown; guardian_email?: unknown };
    if (!isPlausibleDob(meta.date_of_birth) || (ageOn(meta.date_of_birth) ?? 99) >= 13) return;
    if (typeof meta.guardian_email !== 'string' || !meta.guardian_email.trim()) return;
    const admin = createAdminClient();
    const { data, error } = await admin.from('guardian_consents').select('user_id').eq('user_id', user.id).maybeSingle();
    if (error || data) return;
    const result = await requestGuardianConsent(user.id, meta.guardian_email);
    if (!result.success) console.error('[auth] guardian consent:', result.error);
  } catch (e) {
    console.error('[auth] guardian consent:', e instanceof Error ? e.message : e);
  }
}

/** Whether the signed-in person should see the dashboard prompt, and which address to offer them. */
export async function guardianPromptFor(userId: string, fallbackEmail = ''): Promise<{ show: boolean; email: string }> {
  const admin = createAdminClient();
  const { data: profiles, error: profileError } = await admin.from('profiles').select('date_of_birth').eq('id', userId).limit(1);
  if (profileError) throw new Error(profileError.message);
  const dob = ((profiles ?? [])[0] as { date_of_birth?: string | null } | undefined)?.date_of_birth;
  if ((ageOn(dob) ?? 99) >= 13) return { show: false, email: '' };
  // Same parent lookup as parentsOf: a verified link is already consent, so the prompt stays hidden.
  const [{ data: links, error: linkError }, { data: consent, error: consentError }] = await Promise.all([
    admin.from('child_profiles').select('parent_child_links!inner ( verified_at )').eq('linked_user_id', userId).not('parent_child_links.verified_at', 'is', null).limit(1),
    admin.from('guardian_consents').select('guardian_email, confirmed_at').eq('user_id', userId).maybeSingle(),
  ]);
  if (linkError || consentError) throw new Error(linkError?.message ?? consentError?.message ?? 'Could not check guardian confirmation.');
  const row = consent as { guardian_email?: string; confirmed_at?: string | null } | null;
  const status = ageStatus({
    clubJunior: false,
    dob,
    hasVerifiedParent: (links ?? []).length > 0,
    guardianConsented: !!row?.confirmed_at,
  }).status;
  const stored = typeof row?.guardian_email === 'string' ? row.guardian_email : '';
  return { show: status === 'needs_guardian', email: stored || fallbackEmail };
}

/** Presses the button on the confirm page. Opening the link is not enough, and a token older than 7 days is refused. */
export async function confirmGuardianConsent(token: string): Promise<ConfirmResult> {
  if (!TOKEN.test(token)) return { success: false, error: INVALID, code: 'invalid' };
  const token_hash = createHash('sha256').update(token).digest('hex');
  const admin = createAdminClient();
  const { data, error } = await admin.from('guardian_consents')
    .select('user_id, confirmed_at, token_issued_at, created_at')
    .eq('token_hash', token_hash)
    .maybeSingle();
  if (error) return { success: false, error: UNAVAILABLE, code: 'unavailable' };
  const row = data as ConsentRow | null;
  if (!row?.user_id || row.confirmed_at) return { success: false, error: USED, code: 'used' };
  const issuedAt = row.token_issued_at ?? row.created_at;
  const issuedMs = typeof issuedAt === 'string' ? new Date(issuedAt).getTime() : NaN;
  if (!Number.isFinite(issuedMs) || Date.now() - issuedMs > GUARDIAN_TOKEN_TTL_MS) {
    return { success: false, error: USED, code: 'used' };
  }
  const { data: updated, error: updateError } = await admin.from('guardian_consents')
    .update({ confirmed_at: new Date().toISOString(), token_hash: null })
    .eq('user_id', row.user_id)
    .eq('token_hash', token_hash)
    .is('confirmed_at', null)
    .select('user_id');
  if (updateError) return { success: false, error: UNAVAILABLE, code: 'unavailable' };
  if (!updated || updated.length === 0) return { success: false, error: USED, code: 'used' };
  return { success: true };
}
