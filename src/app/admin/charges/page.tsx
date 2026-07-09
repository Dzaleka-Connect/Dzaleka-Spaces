import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { formatMwk } from "@/lib/types";

export const metadata: Metadata = {
  title: "Admin Charges Oversight",
};

export default async function AdminChargesPage() {
  if (!isSupabaseConfigured()) {
    redirect("/admin");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  // Fetch all charges (moderator/admin check is handled by RLS and router gating)
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("charges")
    .select("*, occupancies(spaces(landmark, zones(name)), provider_id)")
    .order("due_date", { ascending: false });

  if (error) {
    console.error("AdminChargesPage failed:", error.message);
  }

  const charges = data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Charges Oversight</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          System-wide audit trail of scheduled rent, deposits, and service fees.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Charges Log</CardTitle>
          <CardDescription>View status of all scheduled charges across the marketplace.</CardDescription>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">No charges recorded in system</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Occupancy ID</TableHead>
                  <TableHead>Space Landmark</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {charges.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.occupancy_id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{c.occupancies?.spaces?.landmark}</span>
                        <span className="text-xs text-muted-foreground">{c.occupancies?.spaces?.zones?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{c.description ?? "Rent payment"}</TableCell>
                    <TableCell className="font-semibold">{formatMwk(c.amount_mwk)}</TableCell>
                    <TableCell>{new Date(c.due_date).toLocaleDateString()}</TableCell>
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
                        {c.status}
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
