// GET   /api/profile  → { profile, wallet }
// PATCH /api/profile  → update full_name / display_name
// DELETE /api/profile → close the account (see below for what is removed and what is kept)
// Auth: Bearer access token (Expo) or cookie session (web).

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ensureProfileAndRoles } from '@/lib/auth/onboarding';
import { applyProfileUpdate, fetchProfile, fetchWallet } from '@/lib/profile/service';
import { fail, readJson, unauthorized } from '@/lib/utils/http';

export async function GET(req: NextRequest) {
  const { supabase, user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  let profile = await fetchProfile(supabase, user.id);
  // Mobile sign-ups have no web callback to create the profile, so create it on first load
  if (!profile.success && profile.error === 'Profile not found') {
    await ensureProfileAndRoles(user);
    profile = await fetchProfile(supabase, user.id);
  }
  if (!profile.success) return fail(profile.error);
  const wallet = await fetchWallet(supabase, user.id);

  return NextResponse.json({ profile: profile.data, wallet: wallet.success ? wallet.data : null });
}

export async function PATCH(req: NextRequest) {
  const { supabase, user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const result = await applyProfileUpdate(supabase, user.id, await readJson(req));
  if (!result.success) return fail(result.error);
  return NextResponse.json({ profile: result.data });
}

// Closes the caller's account. Required by App Store guideline 5.1.1(v): an app that lets
// people sign up must let them delete the account from inside the app.
//
// What happens:
//   - Sign-in is disabled for good and the email is released (Supabase soft delete).
//   - The profile is anonymised: name, email and push token are wiped.
//   - Step history, platform roles and club memberships are deleted.
// What is kept, with the person no longer identifiable from their profile:
//   - Records that belong to a club or that the law may require a club to keep, such as
//     safeguarding incidents and notes, consent records, finance entries and shifts created.
//     Around forty tables reference the user without ON DELETE, so a hard delete would be
//     refused by the database for anyone who had ever created such a record.
// The retention of those records needs to be described in the privacy policy.
export async function DELETE(req: NextRequest) {
  const { user } = await getRequestAuth(req);
  if (!user) return unauthorized();

  const admin = createAdminClient();

  // A club must not be left without an admin while it still has members
  const { data: adminOf, error: adminError } = await admin
    .from('club_members')
    .select('club_id')
    .eq('user_id', user.id)
    .eq('role', 'club_admin')
    .eq('is_active', true);
  if (adminError) return fail('Could not check your club memberships', 500);

  for (const membership of adminOf ?? []) {
    const { data: others, error: othersError } = await admin
      .from('club_members')
      .select('role')
      .eq('club_id', membership.club_id)
      .eq('is_active', true)
      .neq('user_id', user.id);
    if (othersError) return fail('Could not check your club memberships', 500);

    const rows = others ?? [];
    if (rows.length > 0 && !rows.some((row) => row.role === 'club_admin')) {
      const { data: club } = await admin.from('clubs').select('name').eq('id', membership.club_id).maybeSingle();
      const name = (club?.name as string | undefined) ?? 'your club';
      return fail(`You are the only admin of ${name}. Make another member an admin before deleting your account.`, 409);
    }
  }

  // Each step is safe to repeat, so a failure part-way can simply be retried
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: 'Deleted member',
      display_name: 'Deleted member',
      email: `deleted-${user.id}@deleted.invalid`,
      is_active: false,
      push_token: null,
      push_platform: null,
      push_updated_at: null,
    })
    .eq('id', user.id);
  if (profileError) return fail('Could not delete your account. Please try again.', 500);

  for (const table of ['steps_log', 'user_roles', 'club_members'] as const) {
    const { error } = await admin.from(table).delete().eq('user_id', user.id);
    if (error) return fail('Could not delete your account. Please try again.', 500);
  }

  // Last, so that everything above can still be retried if it fails
  const { error: authError } = await admin.auth.admin.deleteUser(user.id, true);
  if (authError) return fail('Could not delete your account. Please try again.', 500);

  return NextResponse.json({ ok: true });
}
