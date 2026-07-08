import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building, Info, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { formatMwk } from "@/lib/types";

export const metadata: Metadata = {
  title: "My listings",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  published: "default",
  pending_review: "secondary",
  changes_requested: "destructive",
  rejected: "destructive",
};

export default async function ProviderListingsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Listing management is available once a Supabase project is
            connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data: spaces } = await supabase
    .from("spaces")
    .select("id")
    .eq("provider_id", user.id);
  const spaceIds = (spaces ?? []).map((s) => s.id);

  const { data: listings } = spaceIds.length
    ? await supabase
        .from("listings")
        .select(
          "id, slug, title, status, price_mwk, billing_period, published_at, created_at"
        )
        .in("space_id", spaceIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My listings</h1>
          <p className="mt-1 text-muted-foreground">
            Advertisements for your spaces and where each one sits in the
            verification pipeline.
          </p>
        </div>
        <Button render={<Link href="/list-a-space" />} nativeButton={false}>
          <Plus data-icon="inline-start" />
          New listing
        </Button>
      </div>

      {(listings ?? []).length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building />
            </EmptyMedia>
            <EmptyTitle>No listings yet</EmptyTitle>
            <EmptyDescription>
              Submit a space to create your first listing.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(listings ?? []).map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">
                  {l.status === "published" ? (
                    <Link
                      href={`/spaces/${l.slug ?? l.id}`}
                      className="hover:underline"
                    >
                      {l.title}
                    </Link>
                  ) : (
                    l.title
                  )}
                </TableCell>
                <TableCell>
                  {formatMwk(l.price_mwk)}/
                  {l.billing_period === "daily" ? "day" : "mo"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[l.status] ?? "outline"}>
                    {l.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {l.published_at
                    ? new Date(l.published_at).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/provider/listings/${l.id}/preview`} />}
                      nativeButton={false}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/provider/listings/${l.id}/edit`} />}
                      nativeButton={false}
                    >
                      Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
