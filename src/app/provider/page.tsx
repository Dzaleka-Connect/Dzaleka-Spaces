import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Building, Info, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, formatMwk } from "@/lib/types";

export const metadata: Metadata = {
  title: "Provider dashboard",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  published: "default",
  pending_review: "secondary",
  changes_requested: "destructive",
  rejected: "destructive",
};

export default async function ProviderPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            The provider dashboard is available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();

  const [{ data: spaces }, { data: enquiries }] = await Promise.all([
    supabase
      .from("spaces")
      .select("id, category, landmark, created_at")
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("enquiries")
      .select("id, listing_id, name, contact, channel, message, created_at")
      .neq("seeker_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const spaceIds = (spaces ?? []).map((s) => s.id);
  const { data: listings } = spaceIds.length
    ? await supabase
        .from("listings")
        .select("id, space_id, title, price_mwk, billing_period, status, created_at")
        .in("space_id", spaceIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const listingIds = new Set((listings ?? []).map((l) => l.id));
  const myEnquiries = (enquiries ?? []).filter((e) => listingIds.has(e.listing_id));
  const published = (listings ?? []).filter((l) => l.status === "published");
  const pending = (listings ?? []).filter(
    (l) => l.status === "pending_review" || l.status === "changes_requested"
  );

  const enquiryIds = myEnquiries.map((e) => e.id);
  const { data: viewingRows } = enquiryIds.length
    ? await supabase
        .from("viewings")
        .select("id")
        .in("enquiry_id", enquiryIds)
        .in("status", ["requested", "proposed", "confirmed"])
    : { data: [] };
  const viewingCount = (viewingRows ?? []).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Provider dashboard</h1>
          <p className="mt-1 text-muted-foreground">Your spaces, listings and enquiries.</p>
        </div>
        <Button render={<Link href="/list-a-space" />} nativeButton={false}>
          <Plus data-icon="inline-start" />
          Add space
        </Button>
      </div>

      <Link
        href="/help/provider-guide"
        className="flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm transition-colors hover:bg-primary/10"
      >
        <BookOpen className="size-5 shrink-0 text-primary" />
        <span className="flex-1">
          <span className="font-medium">New here?</span>{" "}
          <span className="text-muted-foreground">
            The provider guide walks you through listing, verification, enquiries, occupancy records
            and receipts.
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: "Spaces", value: (spaces ?? []).length },
          { label: "Published listings", value: published.length },
          { label: "Awaiting verification", value: pending.length },
          { label: "Enquiries", value: myEnquiries.length },
          { label: "Viewings", value: viewingCount },
        ].map((m) => (
          <Card key={m.label} className="py-4">
            <CardHeader>
              <CardDescription>{m.label}</CardDescription>
              <CardTitle className="text-3xl">{m.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listings</CardTitle>
          <CardDescription>Every listing is verified in person before publication.</CardDescription>
        </CardHeader>
        <CardContent>
          {(listings ?? []).length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Building />
                </EmptyMedia>
                <EmptyTitle>No listings yet</EmptyTitle>
                <EmptyDescription>
                  Submit your first space and it will appear here while it moves through
                  verification.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(listings ?? []).map((l) => {
                  const space = (spaces ?? []).find((s) => s.id === l.space_id);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.title}</TableCell>
                      <TableCell>{space ? categoryLabel(space.category) : "—"}</TableCell>
                      <TableCell>
                        {formatMwk(l.price_mwk)}/{l.billing_period === "daily" ? "day" : "mo"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[l.status] ?? "outline"}>
                          {l.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enquiries & viewings</CardTitle>
          <CardDescription>Respond to seekers and confirm viewing times.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/provider/enquiries" />}
            nativeButton={false}
          >
            All enquiries
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/provider/viewings" />}
            nativeButton={false}
          >
            Viewings
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/provider/occupancies" />}
            nativeButton={false}
          >
            Occupancies
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent enquiries</CardTitle>
          <CardDescription>Reply using the channel each person asked for.</CardDescription>
        </CardHeader>
        <CardContent>
          {myEnquiries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No enquiries yet. They will appear here as soon as someone asks about one of your
              published listings.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {myEnquiries.map((e) => {
                const listing = (listings ?? []).find((l) => l.id === e.listing_id);
                return (
                  <li key={e.id} className="flex flex-col gap-1 rounded-lg border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        {e.name} · {listing?.title ?? "Listing"}
                      </span>
                      <Badge variant="outline">{e.channel}</Badge>
                    </div>
                    <p className="text-sm">
                      Contact: <span className="font-medium">{e.contact}</span>
                    </p>
                    {e.message ? (
                      <p className="text-sm text-muted-foreground">{e.message}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      render={<Link href={`/provider/enquiries/${e.id}`} />}
                      nativeButton={false}
                    >
                      Open
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
