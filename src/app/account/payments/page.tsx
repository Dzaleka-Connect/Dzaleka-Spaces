import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSessionUser } from "@/lib/auth";
import { listAllPaymentsForOccupant } from "@/lib/payments";
import { listOccupanciesForOccupant } from "@/lib/occupancies";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatMwk } from "@/lib/types";
import { TenantConfirmPaymentButton } from "./confirm-button";
import { ReportPaymentForm } from "./report-form-client";

export const metadata: Metadata = {
  title: "My Payments",
};

export default async function AccountPaymentsPage() {
  if (!isSupabaseConfigured()) {
    redirect("/account");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const payments = await listAllPaymentsForOccupant(user.id);
  const occupancies = await listOccupanciesForOccupant(user.id);
  
  const activeOccupancies = occupancies.filter(
    (o) => o.status === "active" || o.status === "notice_given" || o.status === "awaiting_occupant_confirmation"
  );

  const pendingConfirmations = payments.filter(
    (p) => p.status === "pending_confirmation" && !p.payerConfirmedAt
  );

  const totalConfirmed = payments
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + p.amountMwk, 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Payments</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Report new payments, confirm cash receipts, or view verified transaction details.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_350px]">
        {/* Left Side: Payments List */}
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="py-2">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Paid & Confirmed</CardDescription>
                <CardTitle className="text-2xl font-bold text-success">
                  {formatMwk(totalConfirmed)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="py-2">
              <CardHeader className="pb-1">
                <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Awaiting Your Confirmation</CardDescription>
                <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {pendingConfirmations.length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All reported and confirmed payments.</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="size-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold text-foreground">No payments recorded</p>
                  <p className="text-xs text-muted-foreground mt-1">Use the panel on the right to report one.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Space</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{p.spaceTitle}</span>
                            <span className="text-xs text-muted-foreground">{p.spaceZone}</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{p.method.replace("_", " ")}</TableCell>
                        <TableCell className="font-semibold">{formatMwk(p.amountMwk)}</TableCell>
                        <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              p.status === "confirmed"
                                ? "default"
                                : p.status === "pending_confirmation"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {p.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" render={<Link href={`/account/payments/${p.id}`} />} nativeButton={false}>
                              <Eye className="size-4" />
                            </Button>
                            {p.status === "pending_confirmation" && !p.payerConfirmedAt && (
                              <TenantConfirmPaymentButton paymentId={p.id} />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Report Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Report a Payment</CardTitle>
              <CardDescription>
                If you made a cash payment or mobile money transfer, log it here so your provider can confirm it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeOccupancies.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  No active occupancy records. You must be added to an occupancy by a provider before reporting payments.
                </div>
              ) : (
                <ReportPaymentForm occupancies={activeOccupancies} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
