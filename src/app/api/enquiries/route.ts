// POST /api/enquiries → { ok: true }
// Saves a message from the contact form, or from a club admin asking about their plan.
// Open to anyone, so everything is checked and cut to length, and nothing is echoed back.

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { getAdminClubIds } from '@/lib/auth/admin';
import { parseEnquiry } from '@/lib/enquiries/logic';
import { fail, readJson } from '@/lib/utils/http';

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
  return NextResponse.json({ ok: true });
}
