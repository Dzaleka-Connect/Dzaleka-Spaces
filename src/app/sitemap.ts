import type { MetadataRoute } from "next";
import { appBaseUrl } from "@/lib/env";
import { getListings } from "@/lib/listings";
import { SPACE_CATEGORIES } from "@/lib/types";
import { getZoneSummaries } from "@/lib/zones";

const STATIC_PATHS = [
  "",
  "/spaces",
  "/zones",
  "/services",
  "/how-it-works",
  "/verification",
  "/safety",
  "/help",
  "/about",
  "/pricing",
  "/partners",
  "/contact",
  "/terms",
  "/privacy",
  "/community-guidelines",
  "/listing-rules",
  "/accessibility",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appBaseUrl();
  const [listings, zones] = await Promise.all([getListings(), getZoneSummaries()]);
  return [
    ...STATIC_PATHS.map((path) => ({
      url: `${base}${path}`,
      changeFrequency: path === "/spaces" ? ("daily" as const) : ("monthly" as const),
      priority: path === "" ? 1 : 0.7,
    })),
    ...listings.map((listing) => ({
      url: `${base}/spaces/${listing.slug ?? listing.id}`,
      lastModified: new Date(listing.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...zones.map((zone) => ({
      url: `${base}/zones/${zone.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...SPACE_CATEGORIES.map((category) => ({
      url: `${base}/categories/${category.value.replace(/_/g, "-")}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
