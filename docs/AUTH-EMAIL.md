# Sign-up confirmation emails

## The problem
Supabase's default confirmation link uses PKCE. The browser that signed up stores a "code verifier"; the link only
works in that same browser. Sign up on a laptop, tap the link on a phone, and Supabase confirms the email but
`/auth/callback` fails with "code verifier not found in storage".

## What the code now does (safe without any dashboard change)
- A database trigger creates the profile and roles when the account is created
  (`supabase/migrations/20261122000011_profile_on_signup.sql`), so nobody is left without a profile.
- `requireUser()` repairs a missing profile at sign-in as a second safety net.
- A different-browser confirmation lands on `/auth/sign-in?confirmed=1` ("Your email is confirmed, please sign in").

## Recommended (manual, optional): token-hash link
In Supabase Dashboard → Authentication → Email templates → **Confirm signup**, change the link to:

    {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup

`/auth/callback` already handles `token_hash` with `verifyOtp`, which needs no verifier, so the link works in any
browser or on any device and signs the person in.

Trade-off: a token-hash link can be consumed by an email scanner that pre-fetches links (some corporate filters do),
which would use it up before the person clicks. PKCE avoids that. Keep PKCE for OAuth (Google), which is unaffected.
Do the same for "Reset password" only if you want it; leave it as is otherwise.
