import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Plus, Wrench } from "lucide-react";
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
  title: "My Maintenance Requests",
};

export default async function AccountMaintenancePage() {
  if (!isSupabaseConfigured()) {
    redirect("/account");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("*, spaces(landmark, zones(name))")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("AccountMaintenancePage failed:", error.message);
  }

  const tickets = data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Requests</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Request repairs, carpentry, or utility checks on your occupied spaces.
          </p>
        </div>
        <Button render={<Link href="/account/maintenance/new" />} nativeButton={false}>
          <Plus className="mr-2 size-4" />
          Request Repair
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Tickets</CardTitle>
          <CardDescription>
            Track repair progress and choose service provider quotes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold text-foreground">No maintenance tickets yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Submit your first repair request above.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {tickets.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{t.title}</span>
                        <span className="text-xs text-muted-foreground">{t.spaces?.landmark}</span>
                      </div>
                    </TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell>
                      <Badge variant={t.priority === "urgent" ? "destructive" : "secondary"}>
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/account/maintenance/${t.id}`} />}
                        nativeButton={false}
                      >
                        <Wrench className="size-4 mr-1" />
                        View Progress
                      </Button>
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
