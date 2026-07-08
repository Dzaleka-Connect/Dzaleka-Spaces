import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Info, SearchX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ListingCard } from "@/components/listing-card";
import { getSessionUser } from "@/lib/auth";
import { getListingsByIds } from "@/lib/listings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { removeSavedListing } from "@/app/spaces/[id]/actions";

export const metadata: Metadata = {
  title: "Saved spaces",
};

export default async function SavedSpacesPage({
  searchParams,
}: {
  searchParams: Promise<{ removed?: string; error?: string }>;
}) {
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Saved spaces are available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data: savedRows } = await supabase
    .from("saved_listings")
    .select("listing_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const listingIds = (savedRows ?? []).map((row) => row.listing_id as string);
  const listings = await getListingsByIds(listingIds);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saved spaces</h1>
          <p className="mt-1 text-muted-foreground">
            Spaces you marked for later review.
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

      {params.error ? (
        <Alert variant="destructive">
          <Info />
          <AlertTitle>Saved space action failed</AlertTitle>
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}
      {params.removed ? (
        <Alert>
          <Heart />
          <AlertTitle>Removed from saved spaces</AlertTitle>
          <AlertDescription>The space was removed from this list.</AlertDescription>
        </Alert>
      ) : null}

      {listings.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No saved spaces</EmptyTitle>
            <EmptyDescription>
              Save spaces from a listing page to compare and return to them
              later.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => {
            const removeAction = removeSavedListing.bind(null, listing.id);

            return (
              <div key={listing.id} className="flex flex-col gap-2">
                <ListingCard listing={listing} />
                <form action={removeAction}>
                  <Button type="submit" variant="outline" size="sm">
                    Remove saved space
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
