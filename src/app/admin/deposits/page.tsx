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
  title: "Admin Deposits Oversight",
};

export default async function AdminDepositsPage() {
  if (!isSupabaseConfigured()) {
    redirect("/admin");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  // Fetch occupancies that have deposit requirements
  const { data, error } = await supabase
    .from("occupancies")
    .select("*, spaces(landmark, zones(name))")
    .gt("deposit_amount_mwk", 0)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("AdminDepositsPage failed:", error.message);
  }

  const occupancies = data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Deposits</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Monitor deposit amounts recorded in active arrangement agreements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deposits Registry</CardTitle>
          <CardDescription>Oversight of security deposits agreed between parties (non-custodial).</CardDescription>
        </CardHeader>
        <CardContent>
          {occupancies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">No deposits recorded in system</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Occupancy ID</TableHead>
                  <TableHead>Space</TableHead>
                  <TableHead>Expected Deposit</TableHead>
                  <TableHead>Rent Amount</TableHead>
                  <TableHead>Billing Period</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {occupancies.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{o.spaces?.landmark}</span>
                        <span className="text-xs text-muted-foreground">{o.spaces?.zones?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-amber-600 dark:text-amber-400">
                      {formatMwk(o.deposit_amount_mwk)}
                    </TableCell>
                    <TableCell>{formatMwk(o.agreed_amount_mwk)}</TableCell>
                    <TableCell className="capitalize">{o.billing_period}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "active" ? "default" : "secondary"}>
                        {o.status}
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
