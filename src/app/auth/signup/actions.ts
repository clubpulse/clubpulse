"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

type Role = "player" | "volunteer" | "parent" | "coach";

type CompleteSignupInput = {
  userId: string;
  fullName: string;
  email: string;
  roles: Role[];
};

type CompleteSignupResult =
  | { success: true }
  | { success: false; error: string };

export async function completeSignup({
  userId,
  fullName,
  email,
  roles,
}: CompleteSignupInput): Promise<CompleteSignupResult> {
  if (!userId || !fullName || !email || roles.length === 0) {
    return { success: false, error: "Missing required fields" };
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

  return { success: true };
}
