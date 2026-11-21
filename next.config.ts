import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/login", destination: "/auth/sign-in", permanent: true },
      { source: "/signin", destination: "/auth/sign-in", permanent: true },
      { source: "/signup", destination: "/auth/sign-up", permanent: true },
    ];
  },
};

export default nextConfig;
