import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookies for a request and returns the user.
// Called from src/proxy.ts (Next 16 renamed middleware.ts -> proxy.ts).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let needsDob = false;
  if (process.env.AGE_VERIFICATION_ENABLED === 'true' && user) {
    const { data, error } = await supabase.from('profiles').select('date_of_birth').eq('id', user.id).maybeSingle();
    needsDob = !!error || !data?.date_of_birth;
  }

  return { response, user, needsDob };
}

// Redirects while keeping any refreshed session cookies.
export function redirectWithCookies(
  url: URL,
  from: NextResponse
): NextResponse {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
