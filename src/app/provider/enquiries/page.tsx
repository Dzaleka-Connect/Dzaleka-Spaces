import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
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
import { listProviderEnquiries } from "@/lib/enquiries";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Provider enquiries",
};

export default async function ProviderEnquiriesPage() {
  if (!isSupabaseConfigured()) redirect("/provider");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const enquiries = await listProviderEnquiries(user.id);
  const listingIds = [...new Set(enquiries.map((e) => e.listing_id))];
  const supabase = await createClient();
  const { data: listings } = listingIds.length
    ? await supabase.from("listings").select("id, title").in("id", listingIds)
    : { data: [] };
  const titleById = new Map(
    (listings ?? []).map((l) => [l.id, l.title as string])
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enquiries</h1>
          <p className="mt-1 text-muted-foreground">
            Respond and arrange viewings with seekers.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/provider" />}
          nativeButton={false}
        >
          Dashboard
        </Button>
      </div>

      {enquiries.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquare />
            </EmptyMedia>
            <EmptyTitle>No enquiries yet</EmptyTitle>
            <EmptyDescription>
              Enquiries appear here when someone asks about your published
              listings.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {enquiries.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {e.name} · {titleById.get(e.listing_id) ?? "Listing"}
                  </CardTitle>
                  <Badge variant="outline">{e.status}</Badge>
                </div>
                <CardDescription>
                  {e.channel} · {new Date(e.created_at).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-sm">
                  Contact: <span className="font-medium">{e.contact}</span>
                </p>
                <Button
                  size="sm"
                  render={<Link href={`/provider/enquiries/${e.id}`} />}
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
