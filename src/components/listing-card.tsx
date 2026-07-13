import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  billingPeriodUnit,
  categoryLabel,
  facilityLabel,
  formatMwk,
  listingHref,
  stayRangeLabel,
  type Listing,
} from "@/lib/types";

export function ListingCard({ listing }: { listing: Listing }) {
  const period = billingPeriodUnit(listing.billingPeriod);
  const stayRange = stayRangeLabel(listing.minStayDays, listing.maxStayDays);
  const extraFacilities = Math.max(0, listing.facilities.length - 2);

  return (
    <Link href={listingHref(listing)} className="group min-w-0">
      <Card className="h-full min-w-0 gap-0 overflow-hidden pt-0 shadow-sm transition-shadow group-hover:shadow-md">
        <div className="relative aspect-[4/3] bg-muted">
          <Image
            src={listing.coverImageUrl ?? "/dzaleka-community-overview.webp"}
            alt={
              listing.coverImageUrl
                ? `Photo of ${listing.title}`
                : "Dzaleka community overview; this listing has no public photograph yet"
            }
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          {!listing.coverImageUrl ? (
            <Badge variant="secondary" className="absolute bottom-3 left-3 bg-background/90">
              Photo pending
            </Badge>
          ) : null}
          {listing.featured ? (
            <Badge className="absolute left-3 top-3 bg-featured text-featured-foreground">
              Featured
            </Badge>
          ) : null}
          {listing.verified ? (
            <Badge
              variant="secondary"
              className="absolute right-3 top-3 bg-background/90 text-success shadow-sm backdrop-blur"
            >
              <BadgeCheck />
              Verified
            </Badge>
          ) : null}
        </div>

        <CardHeader className="gap-1 pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold">
              {formatMwk(listing.priceMwk)}
              <span className="text-sm font-normal text-muted-foreground"> / {period}</span>
            </span>
          </div>
          <CardTitle className="line-clamp-1 text-base font-semibold">{listing.title}</CardTitle>
        </CardHeader>

        <CardContent className="pb-0">
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {listing.zone} · {listing.landmark}
            </span>
          </p>
        </CardContent>

        <CardFooter className="mt-auto pt-3">
          <p className="text-xs text-muted-foreground">
            {categoryLabel(listing.category)}
            {stayRange ? ` · ${stayRange}` : ""}
            {listing.capacity ? ` · up to ${listing.capacity}` : ""}
            {listing.facilities.length > 0
              ? ` · ${listing.facilities
                  .slice(0, 2)
                  .map((f) => facilityLabel(f))
                  .join(", ")}${extraFacilities > 0 ? ` +${extraFacilities}` : ""}`
              : ""}
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}
