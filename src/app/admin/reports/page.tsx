import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Flag, Info } from "lucide-react";
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
import { canModerate, getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Reports",
};

export default async function AdminReportsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Listing reports are available once Supabase is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");

  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("id, reason, details, status, created_at, listings(title)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-muted-foreground">
          Private listing reports. Reporter details stay staff-only.
        </p>
      </div>

      {(reports ?? []).length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Flag />
            </EmptyMedia>
            <EmptyTitle>No reports</EmptyTitle>
            <EmptyDescription>
              Reports submitted from public listing pages appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Listing</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(reports ?? []).map((report) => {
              const listing = Array.isArray(report.listings)
                ? report.listings[0]
                : report.listings;
              return (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">
                    {listing?.title ?? "Listing removed"}
                  </TableCell>
                  <TableCell>{report.reason.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{report.status}</Badge>
                  </TableCell>
                  <TableCell className="max-w-72 truncate text-muted-foreground">
                    {report.details ?? "No details"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(report.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
