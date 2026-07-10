import { getListings } from "./listings";

export interface MapMarker {
  listingId: string;
  listingSlug: string | null;
  title: string;
  zone: string;
  landmark: string;
  priceMwk: number;
  verified: boolean;
  /** Approximate zone-centre offset — never exact household coordinates. */
  lat: number;
  lng: number;
}

// Approximate zone centres inside Dzaleka camp (public-safe, not household GPS).
const ZONE_CENTRES: Record<string, { lat: number; lng: number }> = {
  "Kawale 1": { lat: -14.371, lng: 34.128 },
  "Kawale 2": { lat: -14.373, lng: 34.131 },
  "Likuni 1": { lat: -14.368, lng: 34.125 },
  "Likuni 2": { lat: -14.366, lng: 34.127 },
  Lisungwi: { lat: -14.375, lng: 34.122 },
  Katudza: { lat: -14.378, lng: 34.135 },
  "New Katubza": { lat: -14.38, lng: 34.13 },
  Zomba: { lat: -14.372, lng: 34.118 },
  Blantyre: { lat: -14.369, lng: 34.133 },
  Karonga: { lat: -14.376, lng: 34.126 },
  "Dzaleka Hill": { lat: -14.365, lng: 34.12 },
  "Other recognised area": { lat: -14.374, lng: 34.128 },
};

function jitter(seed: string, magnitude = 0.002): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const lat = ((hash % 1000) / 1000 - 0.5) * magnitude;
  const lng = (((hash >> 10) % 1000) / 1000 - 0.5) * magnitude;
  return { lat, lng };
}

export async function getPublicMapMarkers(): Promise<MapMarker[]> {
  const listings = await getListings();

  return listings.map((listing) => {
    const centre = ZONE_CENTRES[listing.zone] ?? ZONE_CENTRES["Other recognised area"];
    const offset = jitter(listing.id);
    return {
      listingId: listing.id,
      listingSlug: listing.slug,
      title: listing.title,
      zone: listing.zone,
      landmark: listing.landmark,
      priceMwk: listing.priceMwk,
      verified: listing.verified,
      lat: centre.lat + offset.lat,
      lng: centre.lng + offset.lng,
    };
  });
}
