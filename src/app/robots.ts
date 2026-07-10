import type { MetadataRoute } from "next";
import { appBaseUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account/",
        "/provider/",
        "/verifier/",
        "/trades/",
        "/admin/",
        "/api/",
        "/auth/",
        "/sign-in",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/spaces/occupancy/",
      ],
    },
    sitemap: `${appBaseUrl()}/sitemap.xml`,
    host: appBaseUrl(),
  };
}
