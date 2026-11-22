// POST /api/enquiries → { ok: true }
// Saves a message from the contact form, or from a club admin asking about their plan.
// Open to anyone, so everything is checked and cut to length, and nothing is echoed back.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getAdminClubIds } from '@/lib/auth/admin';
import { parseEnquiry } from '@/lib/enquiries/logic';
import { fail, readJson } from '@/lib/utils/http';
import { sendEmail } from '@/lib/email/resend';

const NOTIFY_TO = process.env.ENQUIRY_NOTIFY_TO ?? 'hello@clubpulse.co';

export async function POST(req: NextRequest) {
  const parsed = parseEnquiry(await readJson(req));
  if (!parsed.ok) return parsed.silent ? NextResponse.json({ ok: true }) : fail(parsed.error, 400);

  // A signed-in club admin's enquiry is tied to their club, so we know who is asking
  const { user } = await getRequestAuth(req).catch(() => ({ user: null }));
  const clubId = user ? ((await getAdminClubIds(user.id))[0] ?? null) : null;

  const { error } = await createAdminClient()
    .from('enquiries')
    .insert({ ...parsed.value, user_id: user?.id ?? null, club_id: clubId });
  if (error) return fail('We could not save your message. Please email hello@clubpulse.co instead.', 500);

  // Tell SHIFTUP a club is waiting. The enquiry is already saved, so a failed email changes nothing.
  const v = parsed.value;
  await sendEmail({
    to: NOTIFY_TO,
    replyTo: v.email,
    subject: `New enquiry from ${v.club_name || v.name}`,
    text: [
      `Name: ${v.name}`,
      `Email: ${v.email}`,
      `Club: ${v.club_name ?? 'not given'}`,
      `Role: ${v.role ?? 'not given'}`,
      `Members: ${v.members ?? 'not given'}`,
      `Wants help with: ${v.needs.length ? v.needs.join(', ') : 'not given'}`,
      '',
      v.message ?? '(no message)',
      '',
      'Reply to this email to answer them. The enquiry is also saved in the enquiries table.',
    ].join('\n'),
  });
  return NextResponse.json({ ok: true });
}
