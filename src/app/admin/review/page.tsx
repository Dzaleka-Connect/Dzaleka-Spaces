import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, ClipboardList, Info, MapPin } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { canModerate, getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { categoryLabel, formatMwk } from "@/lib/types";
import { approveAndPublish, rejectListing, requestChanges } from "../actions";
import { getReviewListings } from "../data";

export const metadata: Metadata = {
  title: "Review queue",
};

function checklistBadges(checklist: Record<string, unknown>) {
  return Object.entries(checklist)
    .filter(([, value]) => typeof value === "boolean")
    .map(([key, value]) => (
      <Badge key={key} variant={value ? "secondary" : "outline"}>
        {key.replace(/_/g, " ")}: {value ? "yes" : "no"}
      </Badge>
    ));
}

export default async function AdminReviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    published?: string;
    changes?: string;
    rejected?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            The admin review queue is available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");

  const listings = await getReviewListings();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Review queue</h1>
          <p className="mt-1 text-muted-foreground">
            Publish only after a field checklist exists. Verification confirms listing details and
            stated authority, never ownership.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/admin" />} nativeButton={false}>
          Admin overview
        </Button>
      </div>

      {params.error ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Could not complete review action</AlertTitle>
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}
      {params.published ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Listing published</AlertTitle>
          <AlertDescription>
            The approved listing is now discoverable in the marketplace.
          </AlertDescription>
        </Alert>
      ) : null}
      {params.changes ? (
        <Alert>
          <Info />
          <AlertTitle>Changes requested</AlertTitle>
          <AlertDescription>
            The provider can see the listing needs updates before publication.
          </AlertDescription>
        </Alert>
      ) : null}
      {params.rejected ? (
        <Alert>
          <Info />
          <AlertTitle>Listing rejected</AlertTitle>
          <AlertDescription>The listing has been removed from review.</AlertDescription>
        </Alert>
      ) : null}

      {listings.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>No listings awaiting review</EmptyTitle>
            <EmptyDescription>
              New provider submissions and requested changes will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {listings.map((listing) => {
            const approveAction = approveAndPublish.bind(null, listing.id);
            const changesAction = requestChanges.bind(null, listing.id);
            const rejectAction = rejectListing.bind(null, listing.id);
            const checks = listing.verification
              ? checklistBadges(listing.verification.checklist)
              : [];

            return (
              <Card key={listing.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{categoryLabel(listing.category)}</Badge>
                    <Badge variant="secondary">{listing.status.replace(/_/g, " ")}</Badge>
                    {listing.verification ? (
                      <Badge>Checklist {listing.verification.status}</Badge>
                    ) : (
                      <Badge variant="destructive">No checklist</Badge>
                    )}
                  </div>
                  <CardTitle>{listing.title}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-1.5">
                    <MapPin />
                    {listing.zone} · {listing.landmark} · {formatMwk(listing.priceMwk)}/
                    {listing.billingPeriod === "daily" ? "day" : "month"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {listing.verification ? (
                    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {checks.length ? (
                          checks
                        ) : (
                          <Badge variant="outline">No checklist values</Badge>
                        )}
                      </div>
                      {listing.verification.notes ? (
                        <p className="text-sm text-muted-foreground">
                          {listing.verification.notes}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        Submitted {new Date(listing.verification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <Alert>
                      <Info />
                      <AlertTitle>Waiting for field verification</AlertTitle>
                      <AlertDescription>
                        Publication is blocked until a verifier submits the checklist.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-4 lg:grid-cols-2">
                    <form action={changesAction}>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor={`changes-${listing.id}`}>
                            Reason for changes
                          </FieldLabel>
                          <Input
                            id={`changes-${listing.id}`}
                            name="reason"
                            placeholder="e.g. price or facilities need correction"
                          />
                        </Field>
                        <Field>
                          <Button type="submit" variant="outline">
                            Request changes
                          </Button>
                        </Field>
                      </FieldGroup>
                    </form>
                    <form action={rejectAction}>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor={`reject-${listing.id}`}>
                            Reason for rejection
                          </FieldLabel>
                          <Input
                            id={`reject-${listing.id}`}
                            name="reason"
                            placeholder="e.g. unauthorised or unsafe listing"
                          />
                        </Field>
                        <Field>
                          <Button type="submit" variant="destructive">
                            Reject listing
                          </Button>
                        </Field>
                      </FieldGroup>
                    </form>
                  </div>
                </CardContent>
                <CardFooter>
                  <form action={approveAction}>
                    <Button type="submit" disabled={!listing.verification}>
                      <CheckCircle2 data-icon="inline-start" />
                      Approve and publish
                    </Button>
                  </form>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
