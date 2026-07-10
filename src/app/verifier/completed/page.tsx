import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, Info } from "lucide-react";
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
import { getSessionUser, isStaff } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Completed verifications",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
};

export default async function VerifierCompletedPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            The verifier app is available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!isStaff(user)) redirect("/account");

  const supabase = await createClient();
  const { data: verifications } = await supabase
    .from("verifications")
    .select("id, listing_id, status, created_at, verified_at")
    .eq("verifier_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const listingIds = [...new Set((verifications ?? []).map((v) => v.listing_id))];
  const { data: listings } = listingIds.length
    ? await supabase.from("listings").select("id, title").in("id", listingIds)
    : { data: [] };
  const titleById = new Map((listings ?? []).map((l) => [l.id, l.title as string]));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My completed checklists</h1>
          <p className="mt-1 text-muted-foreground">
            Field checklists you have submitted and the reviewer&apos;s decision on each.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/verifier/assignments" />}
          nativeButton={false}
        >
          Open assignments
        </Button>
      </div>

      {(verifications ?? []).length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardCheck />
            </EmptyMedia>
            <EmptyTitle>Nothing submitted yet</EmptyTitle>
            <EmptyDescription>
              Checklists you complete appear here with their review outcome.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(verifications ?? []).map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">
                  {titleById.get(v.listing_id) ?? "Listing"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(v.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[v.status] ?? "outline"}>
                    {v.status === "pending" ? "awaiting review" : v.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
