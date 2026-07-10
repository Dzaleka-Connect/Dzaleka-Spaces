import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

export const metadata: Metadata = {
  title: "Verifications",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  scheduled: "secondary",
  rejected: "destructive",
  expired: "outline",
};

export default async function ProviderVerificationsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Verification tracking is available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data: spaces } = await supabase.from("spaces").select("id").eq("provider_id", user.id);
  const spaceIds = (spaces ?? []).map((s) => s.id);

  const { data: listings } = spaceIds.length
    ? await supabase.from("listings").select("id, title").in("space_id", spaceIds)
    : { data: [] };
  const listingIds = (listings ?? []).map((l) => l.id);
  const titleById = new Map((listings ?? []).map((l) => [l.id, l.title]));

  const { data: verifications } = listingIds.length
    ? await supabase
        .from("verifications")
        .select("id, listing_id, status, verified_at, reverify_by, created_at")
        .in("listing_id", listingIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Verifications</h1>
        <p className="mt-1 text-muted-foreground">
          Field-visit outcomes for your listings. Checklist details and evidence stay internal; you
          see the status and dates.
        </p>
      </div>

      {(verifications ?? []).length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BadgeCheck />
            </EmptyMedia>
            <EmptyTitle>No verifications yet</EmptyTitle>
            <EmptyDescription>
              After you submit a listing, a field representative arranges a visit and the outcome
              appears here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Re-check due</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(verifications ?? []).map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">
                  {titleById.get(v.listing_id) ?? "Listing"}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[v.status] ?? "outline"}>{v.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {v.verified_at ? new Date(v.verified_at).toLocaleDateString() : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{v.reverify_by ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
