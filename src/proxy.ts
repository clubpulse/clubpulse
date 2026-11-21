import type { NextRequest } from "next/server";
import { redirectWithCookies, updateSession } from "@/lib/supabase/middleware";

// Login-only gate. Role checks (club admin / merchant) live in the (admin) layout
// and in each API route, never here.
const PROTECTED_PATHS = [
  "/dashboard",
  "/admin",
  "/profile",
  "/marketplace",
  "/companion",
  "/wallet",
];

export async function proxy(request: NextRequest) {
  // Lets requireUser() send logged-out visitors back to where they were headed.
  request.headers.set("x-pathname", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtected && !user) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("redirectTo", pathname);
    return redirectWithCookies(signInUrl, response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
