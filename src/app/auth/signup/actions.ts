"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { xiCreateUser } from "@/lib/xi/client";
import { ageOn, isPlausibleDob } from "@/lib/community/age";
import { requestGuardianConsent } from "@/lib/community/guardian-consent";
import { ageVerificationEnabled } from "@/lib/age-verification/flag";
import { signupDobError } from "@/lib/age-verification/rules";

type Role = "player" | "volunteer" | "parent" | "coach";

type CompleteSignupInput = {
  userId: string;
  fullName: string;
  email: string;
  roles: Role[];
  dateOfBirth?: string;
  guardianEmail?: string;
};

type CompleteSignupResult =
  | { success: true }
  | { success: false; error: string };

export async function completeSignup({
  userId,
  fullName,
  email,
  roles,
  dateOfBirth,
  guardianEmail,
}: CompleteSignupInput): Promise<CompleteSignupResult> {
  if (!userId || !fullName || !email || roles.length === 0) {
    return { success: false, error: "Missing required fields" };
  }

  const under13 = isPlausibleDob(dateOfBirth) && (ageOn(dateOfBirth) ?? 99) < 13;
  if (under13) {
    const guardian = typeof guardianEmail === "string" ? guardianEmail.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardian)) {
      return { success: false, error: "Under 13s need a parent or guardian email address." };
    }
  }

  // This action uses the service role key and bypasses RLS entirely, so we
  // must confirm the caller is actually signed in as the user they claim to
  // be — otherwise anyone could write a profile/roles row for any userId.
  const authedClient = await createServerClient();
  const {
    data: { user },
  } = await authedClient.auth.getUser();

  if (!user || user.id !== userId) {
    return { success: false, error: "Unauthorized" };
  }

  const dobError = signupDobError(dateOfBirth, ageVerificationEnabled());
  if (dobError) return { success: false, error: dobError };

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Admin client unavailable",
    };
  }

  const displayName = fullName.split(" ")[0];

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    full_name: fullName,
    display_name: displayName,
    email,
    // Only a believable date is kept; without one the Community stays closed until it is added
    ...(isPlausibleDob(dateOfBirth) ? { date_of_birth: dateOfBirth } : {}),
  });

  if (profileError) {
    return {
      success: false,
      error: `Could not create profile: ${profileError.message}`,
    };
  }

  const { error: rolesError } = await admin.from("user_roles").insert(
    roles.map((role, index) => ({
      user_id: userId,
      role,
      is_primary: index === 0,
    }))
  );

  if (rolesError) {
    return {
      success: false,
      error: `Could not save roles: ${rolesError.message}`,
    };
  }

  // ── Provision The XI account — players only (silent, non-blocking) ───────
  // Only players need an XI account (rewards wallet + fantasy points).
  // Coaches, volunteers, parents and admins do not.
  if (roles.includes('player')) {
    const xiResult = await xiCreateUser({
      clubpulse_user_id: userId,
      name: fullName,
      email,
    });

    if (xiResult?.xi_user_id) {
      // Store xi_user_id on the profile so sync-match can look it up later
      await admin
        .from('profiles')
        .update({ xi_user_id: xiResult.xi_user_id })
        .eq('id', userId);
      // Intentionally not returning on update error — xi_user_id can be
      // backfilled later; sign-up must succeed regardless.
    }
  }

  if (under13) {
    const sent = await requestGuardianConsent(userId, guardianEmail);
    if (!sent.success) return sent;
  }

  return { success: true };
}
