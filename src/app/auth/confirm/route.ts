// Re-export the callback handler so that Supabase email links that point to
// /auth/confirm?token_hash=…&type=… are handled identically to /auth/callback.
export { GET } from "@/app/auth/callback/route";
