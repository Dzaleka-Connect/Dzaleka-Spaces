import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  DoorOpen,
  Flag,
  Heart,
  Info,
  MapPin,
  Scale,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { EnquiryForm } from "@/components/enquiry-form";
import { ListingGallery } from "@/components/listing-gallery";
import { VerifiedBadge } from "@/components/verified-badge";
import { getSessionUser } from "@/lib/auth";
import { getListingMediaByListingId } from "@/lib/media";
import { getListing } from "@/lib/listings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { trackAnalyticsEvent } from "@/lib/track-analytics";
import {
  billingPeriodUnit,
  categoryLabel,
  facilityLabel,
  formatMwk,
  stayRangeLabel,
} from "@/lib/types";
import { reportListing, saveListing } from "./actions";

interface ListingPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    saved?: string;
    reported?: string;
    error?: string;
  }>;
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) return { title: "Space not found" };

  const description = `${categoryLabel(listing.category)} in ${listing.zone}, near ${listing.landmark}. View the checked listing details and arrange a viewing before paying.`;
  const image = listing.coverImageUrl ?? "/dzaleka-marketplace.jpeg";

  return {
    title: listing.title,
    description,
    openGraph: {
      type: "website",
      title: listing.title,
      description,
      images: [{ url: image, alt: listing.coverImageUrl ? listing.title : "Dzaleka marketplace" }],
    },
    twitter: {
      card: "summary_large_image",
      title: listing.title,
      description,
      images: [image],
    },
  };
}

export default async function ListingPage({ params, searchParams }: ListingPageProps) {
  const { id } = await params;
  const status = searchParams ? await searchParams : {};
  const listing = await getListing(id);
  if (!listing) notFound();

  await trackAnalyticsEvent("listing_view", {
    route: `/spaces/${listing.slug ?? listing.id}`,
    properties: {
      listing_id: listing.id,
      category: listing.category,
      zone: listing.zone,
    },
  });

  const media = await getListingMediaByListingId(id);

  const user = await getSessionUser();
  let isSaved = false;
  if (user && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id)
      .eq("listing_id", listing.id)
      .maybeSingle();
    isSaved = Boolean(data);
  }

  const saveAction = saveListing.bind(null, listing.id);
  const reportAction = reportListing.bind(null, listing.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{categoryLabel(listing.category)}</Badge>
          {listing.verified ? (
            <VerifiedBadge verifiedAt={listing.verifiedAt} />
          ) : (
            <Badge variant="outline">Not yet verified</Badge>
          )}
          {listing.featured ? <Badge>Featured</Badge> : null}
        </div>
        <h1 className="text-3xl font-bold">{listing.title}</h1>
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="size-4" />
          {listing.zone} · {listing.landmark}
        </p>
      </div>

      {status.error ? (
        <Alert variant="destructive">
          <Info />
          <AlertTitle>Action could not be completed</AlertTitle>
          <AlertDescription>{status.error}</AlertDescription>
        </Alert>
      ) : null}
      {status.saved ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Space saved</AlertTitle>
          <AlertDescription>You can find it again from your saved spaces.</AlertDescription>
        </Alert>
      ) : null}
      {status.reported ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Report received</AlertTitle>
          <AlertDescription>
            Staff can review the listing report without exposing your details to the provider.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <ListingGallery media={media} title={listing.title} />

          <Card>
            <CardHeader>
              <CardTitle>About this space</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm leading-relaxed">{listing.description}</p>
              <Separator />
              <div className="flex flex-wrap gap-4 text-sm">
                {listing.rooms ? (
                  <span className="flex items-center gap-1.5">
                    <DoorOpen className="size-4 text-muted-foreground" />
                    {listing.rooms} room{listing.rooms === 1 ? "" : "s"}
                  </span>
                ) : null}
                {listing.capacity ? (
                  <span className="flex items-center gap-1.5">
                    <Users className="size-4 text-muted-foreground" />
                    Up to {listing.capacity} people
                  </span>
                ) : null}
                {listing.availableFrom ? (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    Available from {listing.availableFrom}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    Available now
                  </span>
                )}
              </div>
              {listing.facilities.length > 0 ? (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-1.5">
                    {listing.facilities.map((f) => (
                      <Badge key={f} variant="outline">
                        {facilityLabel(f)}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Alert>
            <ShieldAlert />
            <AlertTitle>View before paying</AlertTitle>
            <AlertDescription>
              Always view a space in person before paying rent or a deposit. Dzaleka Spaces never
              asks for payment to arrange a viewing, and verification does not establish ownership
              of land or property.
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {formatMwk(listing.priceMwk)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  per {billingPeriodUnit(listing.billingPeriod)}
                </span>
              </CardTitle>
              {listing.depositMwk ? (
                <CardDescription>Deposit: {formatMwk(listing.depositMwk)}</CardDescription>
              ) : (
                <CardDescription>No deposit required</CardDescription>
              )}
              {stayRangeLabel(listing.minStayDays, listing.maxStayDays) ? (
                <CardDescription>
                  {stayRangeLabel(listing.minStayDays, listing.maxStayDays)}
                </CardDescription>
              ) : null}
              {listing.providerName ? (
                <CardDescription>Provided by {listing.providerName}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <form action={saveAction}>
                    <Button
                      type="submit"
                      variant={isSaved ? "secondary" : "outline"}
                      className="w-full"
                    >
                      <Heart data-icon="inline-start" />
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                  </form>
                  <Button
                    variant="outline"
                    render={<Link href={`/compare?ids=${listing.id}`} />}
                    nativeButton={false}
                  >
                    <Scale data-icon="inline-start" />
                    Compare
                  </Button>
                </div>
                <EnquiryForm listingId={listing.id} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Report listing</CardTitle>
              <CardDescription>
                Use this for false information, unauthorised listing concerns, harassment, privacy
                issues or unsafe conditions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>
                  <Flag data-icon="inline-start" />
                  Report privately
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Report this listing</DialogTitle>
                    <DialogDescription>
                      Reports are staff-only. The provider is not told who submitted the report.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={reportAction}>
                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="report-details">What should staff review?</FieldLabel>
                        <Textarea
                          id="report-details"
                          name="details"
                          required
                          minLength={10}
                          placeholder="Describe the concern. Do not include identity document numbers."
                        />
                        <FieldDescription>
                          For immediate safety concerns, use the approved local protection and
                          support pathways as well.
                        </FieldDescription>
                      </Field>
                      <DialogFooter showCloseButton>
                        <Button type="submit">
                          <Flag data-icon="inline-start" />
                          Submit report
                        </Button>
                      </DialogFooter>
                    </FieldGroup>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
