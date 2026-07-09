import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
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

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={listingHref(listing)} className="group">
      <Card
        className={`h-full gap-2 overflow-hidden pt-0 shadow-sm transition-[box-shadow] ${
          listing.verified
            ? "ring-1 ring-success/25 group-hover:shadow-md group-hover:ring-success/40"
            : "group-hover:shadow-md group-hover:ring-1 group-hover:ring-primary/25"
        }`}
      >
        <div className="relative flex aspect-[5/3] items-end bg-gradient-to-br from-primary/8 via-muted to-accent/12 p-3">
          {listing.coverImageUrl ? (
            <Image
              src={listing.coverImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <MapPin className="absolute right-3 top-3 size-8 text-primary/20" />
          )}
          <div className="relative flex w-full items-center justify-between gap-2">
            <Badge className="border-transparent bg-background/85 text-foreground shadow-sm backdrop-blur">
              {categoryLabel(listing.category)}
            </Badge>
            {listing.featured ? (
              <Badge className="border-transparent bg-featured text-featured-foreground shadow-sm">
                Featured
              </Badge>
            ) : null}
          </div>
          {listing.verified ? (
            <Badge className="absolute right-3 top-3 gap-1 border-success/30 bg-success/15 text-success shadow-sm backdrop-blur">
              <BadgeCheck className="text-success" />
              Verified
            </Badge>
          ) : null}
        </div>
        <CardHeader className="gap-0.5 pb-0">
          <CardTitle className="line-clamp-2 text-base">
            {listing.title}
          </CardTitle>
          <CardDescription className="flex items-center gap-1">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {listing.zone} · {listing.landmark}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-1.5">
          {listing.capacity ? (
            <Badge variant="outline">
              <Users />
              Up to {listing.capacity}
            </Badge>
          ) : null}
          {listing.facilities.slice(0, 3).map((f) => (
            <Badge key={f} variant="secondary">
              {facilityLabel(f)}
            </Badge>
          ))}
        </CardContent>
        <CardFooter className="mt-auto items-baseline justify-between">
          <span className="text-lg font-bold text-primary">
            {formatMwk(listing.priceMwk)}
          </span>
          <span className="text-sm text-muted-foreground">
            per {listing.billingPeriod === "daily" ? "day" : "month"}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
