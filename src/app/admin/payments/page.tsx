import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
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
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { formatMwk } from "@/lib/types";

export const metadata: Metadata = {
  title: "Admin Payments Audit",
};

export default async function AdminPaymentsPage() {
  if (!isSupabaseConfigured()) {
    redirect("/admin");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_records")
    .select("*, occupancies(spaces(landmark, zones(name)))")
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("AdminPaymentsPage failed:", error.message);
  }

  const payments = data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Payments Audit</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Monitor system transaction records, confirmation timestamps, and unresolved payment
          disputes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Payment Log</CardTitle>
          <CardDescription>Comprehensive ledger of reported occupant payments.</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">
                No payments recorded in system
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Occupancy ID</TableHead>
                  <TableHead>Space</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.occupancy_id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{p.occupancies?.spaces?.landmark}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.occupancies?.spaces?.zones?.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{p.method.replace("_", " ")}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.external_reference ?? "—"}
                    </TableCell>
                    <TableCell className="font-semibold">{formatMwk(p.amount_mwk)}</TableCell>
                    <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
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
                        {p.status}
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
