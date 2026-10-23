// Inserts a sample highlight reel so /highlights can be tested without recording a session.
//
//   npx tsx scripts/seed-highlights.ts [email]
//
// With no email, seeds the account with profiles.role = 'admin' (if there's exactly one).
// Uses SUPABASE_SERVICE_ROLE_KEY from .env.local, so RLS doesn't apply.

import { createClient } from '@supabase/supabase-js';
import { insertDemoHighlight } from '../src/lib/highlights-demo';

async function main() {
  process.loadEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const email = process.argv[2]?.trim().toLowerCase();

  const query = supabase.from('profiles').select('id, email');
  const { data: profiles, error } = await (email ? query.ilike('email', email) : query.eq('role', 'admin'));
  if (error) throw new Error(`Couldn't look up the user: ${error.message}`);
  if (!profiles?.length) throw new Error(email ? `No profile with email ${email}` : 'No admin profile found. Pass an email: npx tsx scripts/seed-highlights.ts you@example.com');
  if (profiles.length > 1) throw new Error(`${profiles.length} matching profiles. Pass an email to pick one.`);

  const [profile] = profiles;
  const { data, error: insertError } = await insertDemoHighlight(supabase, profile.id);
  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

  console.log(`Seeded highlight ${data.id} for ${profile.email}. Open /highlights to see it.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
