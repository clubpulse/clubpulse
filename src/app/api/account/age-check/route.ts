import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ageOn } from '@/lib/community/age';
import { ageProviderEnabled, ageVerificationEnabled } from '@/lib/age-verification/flag';
import { mockAgeCheckBlocked, runAdultAgeCheck } from '@/lib/age-verification/provider';

export const dynamic = 'force-dynamic';

/** Solo adult age check. The provider flag is off unless explicitly enabled, and the stub stores no document and no date of birth. */
export async function POST() {
  if (!ageVerificationEnabled() || mockAgeCheckBlocked()) return NextResponse.json({ error: 'Not available' }, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!ageProviderEnabled()) return NextResponse.json({ status: 'unavailable' });

  const admin = createAdminClient();
  const [{ data: profile }, { data: clubs }] = await Promise.all([
    admin.from('profiles').select('date_of_birth').eq('id', user.id).maybeSingle(),
    admin.from('club_members').select('club_id').eq('user_id', user.id).eq('is_active', true).limit(1),
  ]);
  const age = ageOn((profile?.date_of_birth as string | null) ?? null);
  if (age !== null && age < 18) return NextResponse.json({ status: 'unavailable', needsGuardian: true });
  const status = await runAdultAgeCheck({ age, hasClub: (clubs ?? []).length > 0 });
  const provider = process.env.AGE_VERIFICATION_PROVIDER === 'mock' ? 'mock' : 'unconfigured';
  if (provider !== 'mock') await admin.from('age_verifications').insert({ user_id: user.id, provider, status });
  return NextResponse.json({ status });
}
