import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EnquiryThread } from "@/components/enquiry-thread";
import { ViewingActions } from "@/components/viewing-actions";
import { getSessionUser } from "@/lib/auth";
import { getEnquiryForUser } from "@/lib/enquiries";
import { featureEnabled } from "@/lib/features";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { ViewingRecord } from "@/lib/viewings";

export const metadata: Metadata = {
  title: "Enquiry",
};

export default async function ProviderEnquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/provider/enquiries");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const enquiry = await getEnquiryForUser(id, user.id);
  if (!enquiry || enquiry.providerId !== user.id) notFound();

  const attachmentsEnabled = await featureEnabled("enquiry_attachments");

  const supabase = await createClient();
  const { data: viewingRow } = await supabase
    .from("viewings")
    .select(
      "id, enquiry_id, status, proposed_at, alternative_at, confirmed_at, location_released_at, provider_notes, outcome, created_at"
    )
    .eq("enquiry_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const viewing: ViewingRecord | null = viewingRow
    ? {
        id: viewingRow.id,
        enquiryId: viewingRow.enquiry_id,
        listingId: enquiry.listingId,
        listingTitle: enquiry.listingTitle,
        status: viewingRow.status,
        proposedAt: viewingRow.proposed_at,
        alternativeAt: viewingRow.alternative_at,
        confirmedAt: viewingRow.confirmed_at,
        locationReleasedAt: viewingRow.location_released_at,
        providerNotes: viewingRow.provider_notes,
        outcome: viewingRow.outcome,
        seekerName: enquiry.seekerName,
        createdAt: viewingRow.created_at,
      }
    : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {enquiry.listingTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enquiry from {enquiry.seekerName}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/provider/enquiries" />}
          nativeButton={false}
        >
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
          <CardDescription>Seeker contact: {enquiry.seekerContact}</CardDescription>
        </CardHeader>
        <CardContent>
          <EnquiryThread
            enquiry={enquiry}
            viewerRole="provider"
            attachmentsEnabled={attachmentsEnabled}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Viewing</CardTitle>
          <CardDescription>
            Confirm a time and add directions in your notes when the viewing is
            confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ViewingActions
            enquiryId={enquiry.id}
            viewing={viewing}
            role="provider"
          />
        </CardContent>
      </Card>
    </div>
  );
}
