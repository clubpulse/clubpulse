// POST /api/juniors → register a child at the caller's club and link the caller as parent
// Body: { first_name, last_name, date_of_birth (YYYY-MM-DD), gender?, relationship?,
//         emergency_contact_name?, emergency_contact_phone?, medical_notes?, consents?: string[] }

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { parseRegisterJunior, registerJunior } from '@/lib/mobile/club-data';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function POST(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const parsed = parseRegisterJunior(await readJson(req));
  if (!parsed.success) return fail(parsed.error, 400);

  // First address in the chain is the client; the rest are proxies
  const ip = (req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '').split(',')[0].trim() || undefined;
  const result = await registerJunior(user.id, parsed.data, {
    ip_address: ip,
    user_agent: req.headers.get('user-agent') ?? undefined,
  });
  if (!result.success) return fail(result.error, 400);
  return NextResponse.json({ id: result.data.id }, { status: 201 });
}
