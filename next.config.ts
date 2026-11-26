import type { NextConfig } from "next";

// Report-only. /analyse injects the MediaPipe wasm loader as a classic script
// from cdn.jsdelivr.net, then fetches that host's .wasm and the pose models
// from storage.googleapis.com. 'unsafe-eval' already allows compiling the wasm.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.anthropic.com https://cdn.jsdelivr.net https://storage.googleapis.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy-Report-Only', value: csp },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), payment=(self)' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/login", destination: "/auth/sign-in", permanent: true },
      { source: "/signin", destination: "/auth/sign-in", permanent: true },
      { source: "/features/players", destination: "/for-players", permanent: true },
      { source: "/features/availability", destination: "/for-clubs", permanent: true },
      { source: "/features/scorecard", destination: "/for-clubs", permanent: true },
      { source: "/features/finance", destination: "/for-clubs", permanent: true },
      { source: "/features/clubs", destination: "/for-clubs", permanent: true },
      { source: "/features", destination: "/", permanent: true },
      { source: "/signup", destination: "/auth/sign-up", permanent: true },
    ];
  },
};

export default nextConfig;
