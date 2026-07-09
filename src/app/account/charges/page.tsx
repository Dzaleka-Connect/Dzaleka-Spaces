import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSessionUser } from "@/lib/auth";
import { listAllChargesForOccupant } from "@/lib/payments";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatMwk } from "@/lib/types";

export const metadata: Metadata = {
  title: "My Charges",
};

export default async function AccountChargesPage() {
  if (!isSupabaseConfigured()) {
    redirect("/account");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const charges = await listAllChargesForOccupant(user.id);

  const totalOutstanding = charges
    .filter((c) => c.status === "unpaid" || c.status === "partially_paid")
    .reduce((sum, c) => sum + c.amountMwk, 0);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Charges</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Track rent payments, deposits, and utility invoices scheduled by your provider.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="py-2">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Invoiced</CardDescription>
            <CardTitle className="text-2xl font-bold">{charges.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="py-2">
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Outstanding</CardDescription>
            <CardTitle className="text-2xl font-bold text-destructive">
              {formatMwk(totalOutstanding)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Scheduled charges and their payment status.</CardDescription>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">No charges billed yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your provider will schedule rent charges here.
              </p>
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
