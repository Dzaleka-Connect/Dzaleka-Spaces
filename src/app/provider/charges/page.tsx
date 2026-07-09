import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSessionUser } from "@/lib/auth";
import { listAllChargesForProvider } from "@/lib/payments";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatMwk } from "@/lib/types";
import { VoidChargeButton } from "./void-button";

export const metadata: Metadata = {
  title: "Charges Management",
};

export default async function ProviderChargesPage() {
  if (!isSupabaseConfigured()) {
    redirect("/provider");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const charges = await listAllChargesForProvider(user.id);

  const totalOutstanding = charges
    .filter((c) => c.status === "unpaid" || c.status === "partially_paid")
    .reduce((sum, c) => sum + c.amountMwk, 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Scheduled Charges</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Manage rent schedules, security deposits, and extra service fees.
          </p>
        </div>
        <Button render={<Link href="/provider/charges/new" />} nativeButton={false}>
          <Plus className="mr-2 size-4" />
          Schedule Charge
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="py-2">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Scheduled</CardDescription>
            <CardTitle className="text-2xl font-bold">{charges.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="py-2">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outstanding Balance</CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatMwk(totalOutstanding)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Charges Log</CardTitle>
          <CardDescription>All scheduled and historical charges across your spaces.</CardDescription>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">No charges recorded</p>
              <p className="text-xs text-muted-foreground mt-1">Schedule your first rent invoice above.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Space</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{c.spaceTitle}</span>
                        <span className="text-xs text-muted-foreground">{c.spaceZone}</span>
                      </div>
                    </TableCell>
                    <TableCell>{c.description ?? "Rent payment"}</TableCell>
                    <TableCell className="font-semibold">{formatMwk(c.amountMwk)}</TableCell>
                    <TableCell>{new Date(c.dueDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.status === "paid"
                            ? "default"
                            : c.status === "partially_paid"
                              ? "secondary"
                              : c.status === "void"
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {c.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status !== "void" && c.status !== "paid" && (
                        <VoidChargeButton chargeId={c.id} occupancyId={c.occupancyId} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
