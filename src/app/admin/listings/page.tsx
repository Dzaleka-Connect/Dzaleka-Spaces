import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canModerate, getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, formatMwk } from "@/lib/types";

export const metadata: Metadata = {
  title: "Listings",
};

const STATUS_FILTERS = [
  "published",
  "pending_review",
  "changes_requested",
  "rejected",
  "paused",
];

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  published: "default",
  pending_review: "secondary",
  changes_requested: "destructive",
  rejected: "destructive",
};

interface AdminListingsProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminListingsPage({
  searchParams,
}: AdminListingsProps) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Listing administration is available once a Supabase project is
            connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");

  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select(
      "id, title, status, price_mwk, billing_period, published_at, created_at, spaces(category, landmark, zones(name))"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (status) query = query.eq("status", status);

  const { data: listings } = await query;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Listings</h1>
          <p className="mt-1 text-muted-foreground">
            Every listing on the platform. Publication decisions happen in the
            review queue.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/admin/review" />}
          nativeButton={false}
        >
          Open review queue
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={!status ? "default" : "outline"}
          size="sm"
          render={<Link href="/admin/listings" />}
          nativeButton={false}
        >
          All
        </Button>
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            variant={status === s ? "default" : "outline"}
            size="sm"
            render={<Link href={`/admin/listings?status=${s}`} />}
            nativeButton={false}
          >
            {s.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Category · zone</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(listings ?? []).map((l) => {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const space = l.spaces as any;
            return (
              <TableRow key={l.id}>
                <TableCell className="max-w-56 truncate font-medium">
                  {l.status === "published" ? (
                    <Link href={`/spaces/${l.id}`} className="hover:underline">
                      {l.title}
                    </Link>
                  ) : (
                    l.title
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {categoryLabel(space?.category)} · {space?.zones?.name}
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
                  {new Date(l.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
