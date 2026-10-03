// GET   /api/profile  → { profile, wallet }
// PATCH /api/profile  → update full_name / display_name
// Auth: Bearer access token (Expo) or cookie session (web).

import { NextRequest, NextResponse } from 'next/server';
import { getRequestAuth } from '@/lib/supabase/request-auth';
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
