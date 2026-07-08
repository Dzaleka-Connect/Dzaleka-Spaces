import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  async redirects() {
    return [
      { source: "/login", destination: "/sign-in", permanent: true },
      {
        source: "/list-your-space",
        destination: "/list-a-space",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
