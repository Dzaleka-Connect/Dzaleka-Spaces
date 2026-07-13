export const SPACE_CATEGORIES = [
  { value: "community_venue", label: "Community venue" },
  { value: "training_space", label: "Training space" },
  { value: "meeting_venue", label: "Meeting venue" },
  { value: "office", label: "Office" },
  { value: "shop", label: "Shop" },
  { value: "workshop", label: "Workshop" },
  { value: "storage", label: "Storage" },
  { value: "homestay", label: "Homestay" },
  { value: "room", label: "Room" },
  { value: "shared_room", label: "Shared room" },
  { value: "family_accommodation", label: "Family accommodation" },
] as const;

export type SpaceCategory = (typeof SPACE_CATEGORIES)[number]["value"];

/**
 * Residential categories ride behind the residential_listings /
 * family_accommodation feature flags (enabled by owner decision, migration
 * 00016). UI surfaces filter with these so switching a flag off cleanly
 * hides the category again.
 */
export const RESIDENTIAL_CATEGORY_VALUES = ["room", "shared_room"] as const;
export const FAMILY_CATEGORY_VALUES = ["family_accommodation"] as const;

export function isResidentialCategory(value: string): boolean {
  return (
    (RESIDENTIAL_CATEGORY_VALUES as readonly string[]).includes(value) ||
    (FAMILY_CATEGORY_VALUES as readonly string[]).includes(value)
  );
}

export const ZONES = [
  "Kawale 1",
  "Kawale 2",
  "Likuni 1",
  "Likuni 2",
  "Lisungwi",
  "Katudza",
  "New Katubza",
  "Zomba",
  "Blantyre",
  "Karonga",
  "Dzaleka Hill",
  "Other recognised area",
] as const;

export type Zone = (typeof ZONES)[number];

export const FACILITIES = [
  { value: "water", label: "Water access" },
  { value: "toilet", label: "Toilet" },
  { value: "electricity", label: "Electricity" },
  { value: "solar", label: "Solar power" },
  { value: "internet", label: "Internet" },
  { value: "furnished", label: "Furnished" },
  { value: "cooking", label: "Cooking space" },
  { value: "accessible", label: "Wheelchair accessible" },
  { value: "secure_lock", label: "Lockable / secure" },
] as const;

export type Facility = (typeof FACILITIES)[number]["value"];

export type BillingPeriod = "daily" | "weekly" | "monthly";

export const BILLING_PERIODS: { value: BillingPeriod; label: string; per: string }[] = [
  { value: "daily", label: "Daily", per: "day" },
  { value: "weekly", label: "Weekly", per: "week" },
  { value: "monthly", label: "Monthly", per: "month" },
];

/** Long unit for prose: "per day" / "per week" / "per month". */
export function billingPeriodUnit(period: string): string {
  return BILLING_PERIODS.find((p) => p.value === period)?.per ?? "month";
}

/** Short unit for dense tables: day / wk / mo. */
export function billingPeriodShort(period: string): string {
  if (period === "daily") return "day";
  if (period === "weekly") return "wk";
  return "mo";
}

/** "2–14 day stays" / "From 2 days" / "Up to 14 days" for short-stay listings. */
export function stayRangeLabel(min: number | null, max: number | null): string | null {
  if (min && max) return min === max ? `${min}-day stays` : `${min}–${max} day stays`;
  if (min) return `From ${min} day${min === 1 ? "" : "s"}`;
  if (max) return `Up to ${max} day${max === 1 ? "" : "s"}`;
  return null;
}

export interface Listing {
  id: string;
  slug: string | null;
  title: string;
  category: SpaceCategory;
  zone: string;
  landmark: string;
  description: string;
  rooms: number | null;
  capacity: number | null;
  facilities: string[];
  priceMwk: number;
  depositMwk: number | null;
  billingPeriod: BillingPeriod;
  minStayDays: number | null;
  maxStayDays: number | null;
  availableFrom: string | null;
  verified: boolean;
  verifiedAt: string | null;
  featured: boolean;
  providerName: string | null;
  whatsapp: string | null;
  createdAt: string;
  coverImagePath: string | null;
  coverImageBucket: string | null;
  coverImageUrl: string | null;
}

export interface ListingFilters {
  q?: string;
  category?: string;
  zone?: string;
  minPrice?: number;
  maxPrice?: number;
  billingPeriod?: BillingPeriod;
  availableBy?: string;
  minRooms?: number;
  facilities?: string[];
  verifiedOnly?: boolean;
  recentlyVerifiedDays?: number;
  sort?: "relevance" | "recent" | "price_asc" | "price_desc" | "verified_recent" | "available_soon";
  page?: number;
  pageSize?: number;
}

export function categoryLabel(value: string): string {
  return SPACE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function facilityLabel(value: string): string {
  return FACILITIES.find((f) => f.value === value)?.label ?? value;
}

export function formatMwk(amount: number): string {
  return `MWK ${amount.toLocaleString("en-MW")}`;
}

export function listingHref(listing: Pick<Listing, "id" | "slug">): string {
  return `/spaces/${listing.slug ?? listing.id}`;
}

export const TRADE_CATEGORIES = [
  "Building repairs",
  "Carpentry",
  "Electrical",
  "Plumbing",
  "Roofing",
  "Painting",
  "Cleaning",
  "Solar",
  "Water systems",
  "Locks and security",
  "Other approved service",
] as const;
