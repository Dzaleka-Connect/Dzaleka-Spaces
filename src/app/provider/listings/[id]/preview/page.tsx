import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { billingPeriodUnit, categoryLabel, facilityLabel, formatMwk } from "@/lib/types";

export const metadata: Metadata = {
  title: "Listing preview",
};

export default async function ProviderListingPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const { id } = await params;
  if (!isSupabaseConfigured()) redirect("/provider/listings");

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select(
      "id, title, status, price_mwk, deposit_mwk, billing_period, available_from, spaces(category, landmark, description, rooms, capacity, facilities, zones(name))"
    )
    .eq("id", id)
    .maybeSingle();

  if (!listing) redirect("/provider/listings");
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const space = listing.spaces as any;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">{listing.title}</h1>
        <p className="mt-1 text-muted-foreground">
          Provider preview. Public seekers only see this after publication.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge>{listing.status.replace(/_/g, " ")}</Badge>
            <Badge variant="outline">{categoryLabel(space?.category ?? "other")}</Badge>
          </div>
          <CardTitle>
            {formatMwk(listing.price_mwk)} per{" "}
            {billingPeriodUnit(listing.billing_period)}
          </CardTitle>
          <CardDescription>
            {space?.zones?.name ?? "Unknown zone"} · {space?.landmark}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed">{space?.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {(space?.facilities ?? []).map((facility: string) => (
              <Badge key={facility} variant="outline">
                {facilityLabel(facility)}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Deposit: {listing.deposit_mwk ? formatMwk(listing.deposit_mwk) : "None"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
