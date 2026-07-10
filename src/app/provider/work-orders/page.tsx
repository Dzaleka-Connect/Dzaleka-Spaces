import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Wrench } from "lucide-react";
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
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Work Orders Oversight",
};

export default async function ProviderWorkOrdersPage() {
  if (!isSupabaseConfigured()) {
    redirect("/provider");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_work_orders")
    .select("*, maintenance_tickets!inner(title, spaces!inner(landmark, zones(name), provider_id))")
    .eq("maintenance_tickets.spaces.provider_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("ProviderWorkOrdersPage failed:", error.message);
  }

  const workOrders = data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Active Work Orders</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Track repairs assigned to service providers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Work Orders Registry</CardTitle>
          <CardDescription>Oversight of active and completed repairs.</CardDescription>
        </CardHeader>
        <CardContent>
          {workOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">No active work orders</p>
              <p className="text-xs text-muted-foreground mt-1">
                Quotes accepted by you or the occupant will generate work orders.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Work Order ID</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {workOrders.map((wo: any) => {
                  const ticket = wo.maintenance_tickets;
                  const space = ticket?.spaces;
                  return (
                    <TableRow key={wo.id}>
                      <TableCell className="font-mono text-xs">{wo.id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{ticket?.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {space?.landmark} ({space?.zones?.name})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {wo.scheduled_for
                          ? new Date(wo.scheduled_for).toLocaleDateString()
                          : "Not scheduled"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {wo.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          render={<Link href={`/provider/maintenance/${wo.ticket_id}`} />}
                          nativeButton={false}
                        >
                          <Wrench className="size-4 mr-1" />
                          View Ticket
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
