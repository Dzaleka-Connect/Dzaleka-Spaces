import Link from "next/link";
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
  type Listing,
} from "@/lib/types";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/spaces/${listing.id}`} className="group">
      <Card className="h-full gap-4 overflow-hidden pt-0 transition-shadow group-hover:shadow-md">
        <div className="flex h-32 items-end bg-gradient-to-br from-primary/15 via-muted to-muted/40 p-3">
          <div className="flex w-full items-center justify-between gap-2">
            <Badge variant="outline" className="bg-background/80">
              {categoryLabel(listing.category)}
            </Badge>
            {listing.featured ? <Badge>Featured</Badge> : null}
          </div>
        </div>
        <CardHeader>
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
          {listing.verified ? (
            <Badge variant="secondary">
              <BadgeCheck className="text-primary" />
              Verified
            </Badge>
          ) : null}
          {listing.capacity ? (
            <Badge variant="outline">
              <Users />
              Up to {listing.capacity}
            </Badge>
          ) : null}
          {listing.facilities.slice(0, 2).map((f) => (
            <Badge key={f} variant="outline">
              {facilityLabel(f)}
            </Badge>
          ))}
        </CardContent>
        <CardFooter className="mt-auto justify-between">
          <span className="font-semibold">{formatMwk(listing.priceMwk)}</span>
          <span className="text-sm text-muted-foreground">
            per {listing.billingPeriod === "daily" ? "day" : "month"}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
