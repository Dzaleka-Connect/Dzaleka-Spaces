import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getListingsByIds } from "@/lib/listings";
import { categoryLabel, facilityLabel, formatMwk } from "@/lib/types";

export const metadata: Metadata = {
  title: "Compare spaces",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const listingIds = (ids ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 3);
  const listings = await getListingsByIds(listingIds);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compare spaces</h1>
          <p className="mt-1 text-muted-foreground">
            Compare up to three spaces by amount, location, verification and
            core facilities.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/spaces" />}
          nativeButton={false}
        >
          Browse spaces
        </Button>
      </div>

      {listings.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No spaces selected</EmptyTitle>
            <EmptyDescription>
              Open a listing and choose Compare to start a side-by-side review.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Detail</TableHead>
              {listings.map((listing) => (
                <TableHead key={listing.id}>{listing.title}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Category</TableCell>
              {listings.map((listing) => (
                <TableCell key={listing.id}>
                  {categoryLabel(listing.category)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Amount</TableCell>
              {listings.map((listing) => (
                <TableCell key={listing.id}>
                  {formatMwk(listing.priceMwk)} per{" "}
                  {listing.billingPeriod === "daily" ? "day" : "month"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Deposit</TableCell>
              {listings.map((listing) => (
                <TableCell key={listing.id}>
                  {listing.depositMwk ? formatMwk(listing.depositMwk) : "None"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Location</TableCell>
              {listings.map((listing) => (
                <TableCell key={listing.id}>
                  {listing.zone} · {listing.landmark}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Verification</TableCell>
              {listings.map((listing) => (
                <TableCell key={listing.id}>
                  <Badge variant={listing.verified ? "secondary" : "outline"}>
                    {listing.verified ? "Verified" : "Not yet verified"}
                  </Badge>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Availability</TableCell>
              {listings.map((listing) => (
                <TableCell key={listing.id}>
                  {listing.availableFrom
                    ? `From ${listing.availableFrom}`
                    : "Available now"}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Facilities</TableCell>
              {listings.map((listing) => (
                <TableCell key={listing.id} className="whitespace-normal">
                  <div className="flex flex-wrap gap-1.5">
                    {listing.facilities.slice(0, 6).map((facility) => (
                      <Badge key={facility} variant="outline">
                        {facilityLabel(facility)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Action</TableCell>
              {listings.map((listing) => (
                <TableCell key={listing.id}>
                  <Button
                    size="sm"
                    render={<Link href={`/spaces/${listing.id}`} />}
                    nativeButton={false}
                  >
                    <Scale data-icon="inline-start" />
                    Open
                  </Button>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      )}
    </div>
  );
}
