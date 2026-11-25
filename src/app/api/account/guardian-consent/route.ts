import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** A parent or guardian opens the email link. The token is single-use and stored only as a hash. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.json({ error: 'This confirmation link is not valid.' }, { status: 400 });
  }
  const token_hash = createHash('sha256').update(token).digest('hex');
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('guardian_consents')
    .update({ confirmed_at: new Date().toISOString(), token_hash: null })
    .eq('token_hash', token_hash)
    .is('confirmed_at', null)
    .select('user_id');
  if (error) return NextResponse.json({ error: 'Guardian confirmation is not available yet.' }, { status: 503 });
  if (!data || data.length === 0) return NextResponse.json({ error: 'This confirmation link has already been used or has expired.' }, { status: 400 });
  return NextResponse.json({ ok: true });
}
