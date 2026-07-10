import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ListingCard } from "@/components/listing-card";
import { getListings } from "@/lib/listings";
import { findZoneBySlug } from "@/lib/zones";
import { formatMwk } from "@/lib/types";

interface ZonePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ZonePageProps): Promise<Metadata> {
  const { slug } = await params;
  const zone = await findZoneBySlug(slug);
  return {
    title: zone ? `Spaces in ${zone}` : "Zone not found",
    description: zone
      ? `Available shops, offices, venues and community spaces in ${zone}, Dzaleka.`
      : undefined,
  };
}

export default async function ZonePage({ params }: ZonePageProps) {
  const { slug } = await params;
  const zone = await findZoneBySlug(slug);
  if (!zone) notFound();

  const listings = await getListings({ zone });
  const prices = listings.map((l) => l.priceMwk).sort((a, b) => a - b);
  const median = prices.length ? prices[Math.floor(prices.length / 2)] : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/zones" className="hover:underline">
            Zones
          </Link>{" "}
          / {zone}
        </p>
        <h1 className="mt-1 text-3xl font-bold">Spaces in {zone}</h1>
        <p className="mt-1 text-muted-foreground">
          {listings.length} available space{listings.length === 1 ? "" : "s"}
          {median !== null && listings.length >= 3
            ? ` · typical asking amount around ${formatMwk(median)}`
            : ""}
        </p>
      </div>

      {listings.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No spaces in {zone} right now</EmptyTitle>
            <EmptyDescription>
              New spaces are added as they are verified. Save a search on the browse page to be told
              when something opens here.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" render={<Link href="/spaces" />} nativeButton={false}>
            Browse all spaces
          </Button>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
