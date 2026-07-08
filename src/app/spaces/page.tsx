import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchX } from "lucide-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard } from "@/components/listing-card";
import { SpacesFilters } from "@/components/spaces-filters";
import { getListings } from "@/lib/listings";
import { getZones } from "@/lib/zones";

export const metadata: Metadata = {
  title: "Browse spaces",
};

interface SpacesPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    zone?: string;
    verified?: string;
  }>;
}

export default async function SpacesPage({ searchParams }: SpacesPageProps) {
  const params = await searchParams;
  const [listings, zones] = await Promise.all([
    getListings({
      q: params.q,
      category: params.category,
      zone: params.zone,
      verifiedOnly: params.verified === "1",
    }),
    getZones(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Browse spaces</h1>
        <p className="mt-1 text-muted-foreground">
          Shops, offices, training rooms, venues, workshops and storage in
          Dzaleka.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-20 w-full" />}>
        <SpacesFilters zones={zones} />
      </Suspense>

      {listings.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No spaces found</EmptyTitle>
            <EmptyDescription>
              Try removing a filter, or check back soon — new spaces are added
              as they are verified.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {listings.length} space{listings.length === 1 ? "" : "s"} available
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
