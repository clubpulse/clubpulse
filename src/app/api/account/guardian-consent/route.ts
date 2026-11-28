import { NextRequest, NextResponse } from 'next/server';
import { confirmGuardianConsent } from '@/lib/community/guardian-consent';

export const dynamic = 'force-dynamic';

/**
 * The email link must not confirm on GET. Mail scanners open links by themselves, and a GET that writes
 * confirmed_at would approve the account with no person involved. GET only sends the parent to the page
 * with the button. The button POSTs here.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const url = new URL('/account/guardian-consent', req.url);
  if (/^[a-f0-9]{64}$/.test(token)) url.searchParams.set('token', token);
  return NextResponse.redirect(url);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = String(form.get('token') ?? '');
  let result: Awaited<ReturnType<typeof confirmGuardianConsent>>;
  try {
    result = await confirmGuardianConsent(token);
  } catch {
    result = { success: false, error: 'Guardian confirmation is not available yet.', code: 'unavailable' };
  }
  const url = new URL('/account/guardian-consent', req.url);
  if (result.success) {
    url.searchParams.set('done', '1');
  } else {
    url.searchParams.set('error', result.code);
    if (result.code === 'unavailable' && /^[a-f0-9]{64}$/.test(token)) url.searchParams.set('token', token);
  }
  return NextResponse.redirect(url, 303);
}
