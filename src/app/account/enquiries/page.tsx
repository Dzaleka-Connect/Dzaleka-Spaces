import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Info, MessageSquare } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your enquiries",
};

export default async function AccountEnquiriesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Enquiry history is available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data: enquiries } = await supabase
    .from("enquiries")
    .select("id, listing_id, message, channel, created_at")
    .eq("seeker_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const listingIds = [...new Set((enquiries ?? []).map((e) => e.listing_id))];
  const { data: listingTitles } = listingIds.length
    ? await supabase
        .from("public_listings")
        .select("id, title")
        .in("id", listingIds)
    : { data: [] };
  const titleById = new Map(
    (listingTitles ?? []).map((listing) => [listing.id, listing.title as string])
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your enquiries</h1>
          <p className="mt-1 text-muted-foreground">
            Listing enquiries you sent while signed in.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/account" />}
          nativeButton={false}
        >
          Account
        </Button>
      </div>

      {(enquiries ?? []).length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquare />
            </EmptyMedia>
            <EmptyTitle>No enquiries yet</EmptyTitle>
            <EmptyDescription>
              Browse spaces and send an enquiry to start a viewing
              conversation.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {(enquiries ?? []).map((enquiry) => (
            <Card key={enquiry.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {titleById.get(enquiry.listing_id) ?? "Listing"}
                  </CardTitle>
                  <Badge variant="outline">{enquiry.channel}</Badge>
                </div>
                <CardDescription>
                  Sent {new Date(enquiry.created_at).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {enquiry.message ? (
                  <p className="text-sm text-muted-foreground">
                    {enquiry.message}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No message was added.
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/account/enquiries/${enquiry.id}`} />}
                  nativeButton={false}
                >
                  Open conversation
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
