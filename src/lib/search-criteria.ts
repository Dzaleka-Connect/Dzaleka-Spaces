import type { ListingFilters } from "./types";

export function filtersToCriteria(searchParams: URLSearchParams): ListingFilters {
  const criteria: ListingFilters = {};
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const zone = searchParams.get("zone");
  const maxPrice = searchParams.get("maxPrice");
  if (q) criteria.q = q;
  if (category) criteria.category = category;
  if (zone) criteria.zone = zone;
  if (maxPrice) criteria.maxPrice = Number(maxPrice);
  if (searchParams.get("verified") === "1") criteria.verifiedOnly = true;
  return criteria;
}

export function criteriaToSearchParams(criteria: ListingFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (criteria.q) params.set("q", criteria.q);
  if (criteria.category) params.set("category", criteria.category);
  if (criteria.zone) params.set("zone", criteria.zone);
  if (criteria.maxPrice) params.set("maxPrice", String(criteria.maxPrice));
  if (criteria.verifiedOnly) params.set("verified", "1");
  return params;
}
