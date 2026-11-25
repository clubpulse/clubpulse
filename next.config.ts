import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
