import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Map, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ListingCard } from "@/components/listing-card";
import { SaveSearchButton } from "@/components/save-search-button";
import { SpacesFilters } from "@/components/spaces-filters";
import { getSessionUser } from "@/lib/auth";
import { searchListings } from "@/lib/listings";
import { trackAnalyticsEvent } from "@/lib/track-analytics";
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
    min?: string;
    max?: string;
    billing?: string;
    available?: string;
    rooms?: string;
    facility?: string | string[];
    recent?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function SpacesPage({ searchParams }: SpacesPageProps) {
  const params = await searchParams;
  const facilities = Array.isArray(params.facility)
    ? params.facility
    : params.facility
      ? [params.facility]
      : [];
  const [result, zones, user] = await Promise.all([
    searchListings({
      q: params.q,
      category: params.category === "all" ? undefined : params.category,
      zone: params.zone === "all" ? undefined : params.zone,
      minPrice: params.min ? Number(params.min) : undefined,
      maxPrice: params.max ? Number(params.max) : undefined,
      billingPeriod:
        params.billing === "daily" || params.billing === "monthly" ? params.billing : undefined,
      availableBy: params.available || undefined,
      minRooms: params.rooms ? Number(params.rooms) : undefined,
      facilities,
      verifiedOnly: params.verified === "1",
      recentlyVerifiedDays:
        params.recent && params.recent !== "all" ? Number(params.recent) : undefined,
      sort: [
        "relevance",
        "recent",
        "price_asc",
        "price_desc",
        "verified_recent",
        "available_soon",
      ].includes(params.sort ?? "")
        ? (params.sort as "relevance")
        : "relevance",
      page: params.page ? Number(params.page) : 1,
    }),
    getZones(),
    getSessionUser(),
  ]);
  const { listings, total, page, pageSize } = result;

  if (params.q || params.category || params.zone || params.verified) {
    await trackAnalyticsEvent("search", {
      route: "/spaces",
      properties: {
        q: params.q ?? null,
        category: params.category ?? null,
        zone: params.zone ?? null,
        verified: params.verified === "1",
        result_count: total,
      },
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Browse spaces</h1>
        <p className="mt-1 text-muted-foreground">
          Shops, offices, training rooms, venues, workshops and storage in Dzaleka. Public listings
          show only zone and landmark.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Suspense fallback={<Skeleton className="h-20 w-full" />}>
          <SpacesFilters zones={zones} />
        </Suspense>
        <div className="flex gap-2">
          <Suspense>
            <SaveSearchButton signedIn={Boolean(user)} />
          </Suspense>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/spaces/map" />}
            nativeButton={false}
          >
            <Map data-icon="inline-start" />
            Map
          </Button>
        </div>
      </div>

      {listings.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No spaces found</EmptyTitle>
            <EmptyDescription>
              Try removing a filter, or check back soon — new spaces are added as they are verified.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} space{total === 1 ? "" : "s"} available
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          {total > pageSize ? (
            <nav
              aria-label="Search result pages"
              className="flex items-center justify-center gap-2 pt-4"
            >
              {page > 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link
                      href={{ pathname: "/spaces", query: { ...params, page: String(page - 1) } }}
                    />
                  }
                  nativeButton={false}
                >
                  Previous
                </Button>
              ) : null}
              <span className="text-sm text-muted-foreground">
                Page {page} of {Math.ceil(total / pageSize)}
              </span>
              {page * pageSize < total ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link
                      href={{ pathname: "/spaces", query: { ...params, page: String(page + 1) } }}
                    />
                  }
                  nativeButton={false}
                >
                  Next
                </Button>
              ) : null}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
