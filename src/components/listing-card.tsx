import Link from "next/link";
import Image from "next/image";
import {
  BadgeCheck,
  Boxes,
  Building2,
  GraduationCap,
  Hammer,
  Home,
  MapPin,
  Store,
  Users2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  categoryLabel,
  facilityLabel,
  formatMwk,
  listingHref,
  type Listing,
} from "@/lib/types";

const CATEGORY_ICON: Record<string, typeof Store> = {
  community_venue: Users2,
  training_space: GraduationCap,
  meeting_venue: Users2,
  office: Building2,
  shop: Store,
  workshop: Hammer,
  storage: Boxes,
  homestay: Home,
};

export function ListingCard({ listing }: { listing: Listing }) {
  const Icon = CATEGORY_ICON[listing.category] ?? Building2;
  const period = listing.billingPeriod === "daily" ? "day" : "month";
  const extraFacilities = Math.max(0, listing.facilities.length - 2);

  return (
    <Link href={listingHref(listing)} className="group">
      <Card className="h-full gap-0 overflow-hidden pt-0 shadow-sm transition-shadow group-hover:shadow-md">
        <div className="relative aspect-[4/3] bg-muted">
          {listing.coverImageUrl ? (
            <Image
              src={listing.coverImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Icon className="size-10 text-muted-foreground/25" />
            </div>
          )}
          {listing.featured ? (
            <span className="absolute left-3 top-3 rounded-full bg-featured px-2.5 py-1 text-xs font-medium text-featured-foreground shadow-sm">
              Featured
            </span>
          ) : null}
          {listing.verified ? (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-success shadow-sm backdrop-blur">
              <BadgeCheck className="size-3.5" />
              Verified
            </span>
          ) : null}
        </div>

        <CardHeader className="gap-1 pt-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold tracking-tight">
              {formatMwk(listing.priceMwk)}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {period}
              </span>
            </span>
          </div>
          <CardTitle className="line-clamp-1 text-base font-semibold">
            {listing.title}
          </CardTitle>
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
