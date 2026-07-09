import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  turbopack: {
    root: import.meta.dirname,
    resolveAlias: {
      // @supabase/storage-js >= 2.110 hard-imports iceberg-js for an Iceberg
      // analytics catalog we never use. Alias it to a local stub so the
      // bundle resolves without the (unpublished) dependency.
      "iceberg-js": "./src/lib/stubs/iceberg-js.ts",
    },
  },
  async redirects() {
    return [
      { source: "/login", destination: "/sign-in", permanent: true },
      {
        source: "/list-your-space",
        destination: "/list-a-space",
        permanent: true,
      },
      // Master-roadmap route aliases.
      {
        source: "/account/occupancies",
        destination: "/account/occupancy",
        permanent: false,
      },
      // Auth is passwordless (email OTP): password routes go to sign-in.
      { source: "/forgot-password", destination: "/sign-in", permanent: false },
      { source: "/reset-password", destination: "/sign-in", permanent: false },
    ];
  },
};

export default nextConfig;
