import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { APP_VIEW_COOKIE, isCrossSite, safeAppPath } from '@/lib/auth/app-view';

/**
 * POST /auth/app-session
 *
 * Signs the phone app's web view in as the person already signed in to the app, then sends it
 * to the page it asked for. Form fields: token (the app's access token), next (page to open).
 *
 * The web view gets a session of its own. The app's refresh token never leaves the app: if the
 * website used it, the two would race to renew it and one of them would be signed out.
 *
 * If anything fails the web view lands on the normal sign-in page, so the person can still
 * get in by typing their password.
 */
export async function POST(request: NextRequest) {
  const ownOrigin = request.nextUrl.origin;
  const form = await request.formData().catch(() => null);
  const next = safeAppPath(form?.get('next')?.toString());

  const to = (path: string) => {
    // 303 so the browser follows with a GET
    const response = NextResponse.redirect(new URL(path, ownOrigin), 303);
    response.cookies.set(APP_VIEW_COOKIE, '1', { path: '/', sameSite: 'lax', secure: true, maxAge: 60 * 60 * 24 * 30 });
    return response;
  };
  // Falling back to the sign-in page also clears any web session left in the web view, so a
  // second person using the same phone can never see the first person's pages.
  const signIn = async () => {
    try {
      await (await createClient()).auth.signOut({ scope: 'local' });
    } catch {
      // No session to clear
    }
    return to(`/auth/sign-in?redirectTo=${encodeURIComponent(next)}`);
  };

  if (isCrossSite(request.headers.get('origin'), request.headers.get('sec-fetch-site'), ownOrigin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const token = form?.get('token')?.toString().trim();
  if (!token) return signIn();

  try {
    // Who is this? The token is checked with Supabase, not just decoded.
    const anon = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: who } = await anon.auth.getUser(token);
    const email = who.user?.email;
    if (!who.user || !email) return signIn();

    const cookieClient = await createClient();

    // Already signed in on the web as the same person: nothing to do
    const { data: current } = await cookieClient.auth.getUser();
    if (current.user?.id === who.user.id) return to(next);

    // A one-time sign-in code for that person, used here on the server and never sent anywhere
    const { data: link, error: linkError } = await createAdminClient().auth.admin.generateLink({ type: 'magiclink', email });
    const tokenHash = link?.properties?.hashed_token;
    if (linkError || !tokenHash) return signIn();

    const { data: verified, error: verifyError } = await cookieClient.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
    if (verifyError || verified.user?.id !== who.user.id) {
      return signIn();
    }

    return to(next);
  } catch {
    return signIn();
  }
}
