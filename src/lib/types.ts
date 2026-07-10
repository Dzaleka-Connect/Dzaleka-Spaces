export const SPACE_CATEGORIES = [
  { value: "community_venue", label: "Community venue" },
  { value: "training_space", label: "Training space" },
  { value: "meeting_venue", label: "Meeting venue" },
  { value: "office", label: "Office" },
  { value: "shop", label: "Shop" },
  { value: "workshop", label: "Workshop" },
  { value: "storage", label: "Storage" },
  { value: "homestay", label: "Homestay" },
] as const;

export type SpaceCategory = (typeof SPACE_CATEGORIES)[number]["value"];

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

export type BillingPeriod = "daily" | "monthly";

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
