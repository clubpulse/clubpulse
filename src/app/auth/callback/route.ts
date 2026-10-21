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

  const failure = (detail: string) => {
    console.error("[auth/callback] verification failed:", detail);
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=auth-code-error&detail=${encodeURIComponent(detail)}`
    );
  };

  // Supabase's /verify endpoint forwards its own errors (e.g. otp_expired) as query params
  const upstreamError = searchParams.get("error_description") ?? searchParams.get("error");
  if (upstreamError) return failure(upstreamError);

  const supabase = await createClient();
  let target = next;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure(error.message);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return failure(error.message);
    if (type === "recovery") target = "/auth/reset-password?mode=update";
  } else {
    return failure("Missing code or token_hash in auth link");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) await ensureProfileAndRoles(user);
  return NextResponse.redirect(`${origin}${target}`);
}
