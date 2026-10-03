import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileAndRoles } from "@/lib/auth/onboarding";
import { safeRedirect } from "@/lib/utils/redirect";

// Handles OAuth / PKCE (?code=) and email links (?token_hash=&type=).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeRedirect(searchParams.get("next"));

  const supabase = await createClient();
  let verified = false;
  let target = next;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    verified = !error;
    if (verified && type === "recovery") target = "/auth/reset-password?mode=update";
  }

  if (verified) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await ensureProfileAndRoles(user);
    return NextResponse.redirect(`${origin}${target}`);
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=auth-code-error`);
}
