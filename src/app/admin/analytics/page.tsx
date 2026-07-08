import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Eye,
  FileWarning,
  MessageSquare,
  Search,
} from "lucide-react";
import { AdminAnalyticsCharts } from "@/components/admin-analytics-charts";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAnalyticsDashboard } from "@/lib/analytics";
import { EVENT_LABELS } from "@/lib/analytics-types";
import { canModerate, getSessionUser, hasRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Analytics",
};

const TOTAL_ICONS = {
  listing_view: Eye,
  search: Search,
  enquiry_sent: MessageSquare,
  report_sent: FileWarning,
} as const;

export default async function AdminAnalyticsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");
  if (!hasRole(user, "admin")) redirect("/admin");

  const dashboard = await getAnalyticsDashboard(30);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Last {dashboard.rangeDays} days. Exact locations and verification
          evidence are not stored in analytics events.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          Object.keys(dashboard.totals) as Array<keyof typeof dashboard.totals>
        ).map((key) => {
          const Icon = TOTAL_ICONS[key];
          return (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardDescription>{EVENT_LABELS[key]}</CardDescription>
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-3xl tabular-nums">
                  {dashboard.totals[key].toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <AdminAnalyticsCharts
        daily={dashboard.daily}
        breakdown={dashboard.breakdown}
        funnel={dashboard.funnel}
        rangeDays={dashboard.rangeDays}
      />

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Operations</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardDescription>Published listings</CardDescription>
              <Building2 className="size-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl tabular-nums">
              {dashboard.ops.publishedListings.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardDescription>Pending review</CardDescription>
              <ClipboardList className="size-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl tabular-nums">
              {dashboard.ops.pendingReview.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardDescription>All enquiries</CardDescription>
              <MessageSquare className="size-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl tabular-nums">
              {dashboard.ops.enquiries.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardDescription>Open reports</CardDescription>
              <FileWarning className="size-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl tabular-nums">
              {dashboard.ops.openReports.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardDescription>Viewings</CardDescription>
              <Eye className="size-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl tabular-nums">
              {dashboard.ops.viewings.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardDescription>Occupancy records</CardDescription>
              <ClipboardList className="size-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl tabular-nums">
              {dashboard.ops.occupancies.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
