import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardCheck,
  Flag,
  Info,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canModerate, getSessionUser, hasRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAdminOverview } from "./data";

export const metadata: Metadata = {
  title: "Admin portal",
};

export default async function AdminPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            The admin portal is available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");

  const { stats, auditEvents } = await getAdminOverview();
  const metrics = [
    { label: "Published", value: stats.publishedListings },
    { label: "Pending review", value: stats.pendingReview },
    { label: "Changes requested", value: stats.changesRequested },
    { label: "Pending checklists", value: stats.pendingVerifications },
    { label: "Enquiries", value: stats.enquiries },
    { label: "Open reports", value: stats.openReports },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin portal</h1>
          <p className="mt-1 text-muted-foreground">
            Review publication decisions, feature flags and audit activity.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {user.roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
        <Button render={<Link href="/admin/review" />} nativeButton={false}>
          <ClipboardCheck data-icon="inline-start" />
          Review queue
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {metrics.map((metric) => (
          <Card key={metric.label} className="py-4">
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-3xl">{metric.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <ShieldCheck />
            <CardTitle>Publication review</CardTitle>
            <CardDescription>
              Approve verified listings, request changes, or reject listings
              that cannot be safely published.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              render={<Link href="/admin/review" />}
              nativeButton={false}
            >
              Open review queue
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <SlidersHorizontal />
            <CardTitle>Feature flags</CardTitle>
            <CardDescription>
              Toggle safe pilot features. Fund custody and residential gates
              stay locked off by policy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              render={<Link href="/admin/flags" />}
              nativeButton={false}
              disabled={!hasRole(user, "admin")}
            >
              <Flag data-icon="inline-start" />
              Manage flags
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent audit events</CardTitle>
          <CardDescription>
            Decisions made through the staff portals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {auditEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audit events have been recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Actor role</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {event.action}
                    </TableCell>
                    <TableCell>
                      {event.entity}
                      {event.entityId ? ` · ${event.entityId}` : ""}
                    </TableCell>
                    <TableCell>{event.actorRole ?? "system"}</TableCell>
                    <TableCell>
                      {new Date(event.createdAt).toLocaleString()}
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
