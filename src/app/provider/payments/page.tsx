import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, AlertCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSessionUser } from "@/lib/auth";
import { listAllPaymentsForProvider } from "@/lib/payments";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatMwk } from "@/lib/types";
import { ConfirmPaymentButton } from "./confirm-button";

export const metadata: Metadata = {
  title: "Payments Received",
};

export default async function ProviderPaymentsPage() {
  if (!isSupabaseConfigured()) {
    redirect("/provider");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const payments = await listAllPaymentsForProvider(user.id);

  const pendingConfirmations = payments.filter(
    (p) => p.status === "pending_confirmation" && !p.providerConfirmedAt
  );

  const totalConfirmed = payments
    .filter((p) => p.status === "confirmed")
    .reduce((sum, p) => sum + p.amountMwk, 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payments Log</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Record cash receipts or confirm occupant-provided external payment references.
          </p>
        </div>
        <Button render={<Link href="/provider/payments/new" />} nativeButton={false}>
          <Plus className="mr-2 size-4" />
          Record Payment
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="py-2">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Total Confirmed
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-success">
              {formatMwk(totalConfirmed)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="py-2">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Awaiting Your Confirmation
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {pendingConfirmations.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recorded Transactions</CardTitle>
          <CardDescription>Verify references and approve payments.</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">No payments recorded</p>
              <p className="text-xs text-muted-foreground mt-1">Record a cash payment to start.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Space</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
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
                    <TableCell className="font-mono text-xs">
                      {p.externalReference ?? "—"}
                    </TableCell>
                    <TableCell className="font-semibold">{formatMwk(p.amountMwk)}</TableCell>
                    <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "confirmed"
                            ? "default"
                            : p.status === "pending_confirmation"
                              ? "secondary"
                              : p.status === "disputed"
                                ? "outline"
                                : "destructive"
                        }
                      >
                        {p.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          render={<Link href={`/provider/payments/${p.id}`} />}
                          nativeButton={false}
                        >
                          <Eye className="size-4" />
                        </Button>
                        {p.status === "pending_confirmation" && !p.providerConfirmedAt && (
                          <ConfirmPaymentButton paymentId={p.id} occupancyId={p.occupancyId} />
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
  );
}
