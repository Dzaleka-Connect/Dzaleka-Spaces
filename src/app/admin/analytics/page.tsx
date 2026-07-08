import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { canModerate, getSessionUser, hasRole } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function AdminAnalyticsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Analytics are available once Supabase is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");
  if (!hasRole(user, "admin")) redirect("/admin");

  const supabase = await createClient();
  const eventNames = ["listing_view", "search", "enquiry_sent", "report_sent"];
  const counts = await Promise.all(
    eventNames.map((eventName) =>
      supabase
        .from("analytics_events")
        .select("id", { count: "exact", head: true })
        .eq("event_name", eventName)
    )
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Privacy-safe event counts. Private locations and evidence are not
          stored in analytics events.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {eventNames.map((eventName, index) => (
          <Card key={eventName}>
            <CardHeader>
              <BarChart3 />
              <CardDescription>{eventName.replace(/_/g, " ")}</CardDescription>
              <CardTitle className="text-3xl">
                {counts[index].count ?? 0}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
