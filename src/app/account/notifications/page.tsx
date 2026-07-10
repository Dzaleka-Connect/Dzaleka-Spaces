import type { Metadata } from "next";
import { Bell, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireUser } from "@/lib/portal-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications" };

export default async function AccountNotificationsPage() {
  const user = await requireUser();
  let notifications: {
    id: string;
    template_key: string;
    status: string;
    created_at: string;
    sent_at: string | null;
    payload: Record<string, unknown>;
  }[] = [];
  if (isSupabaseConfigured()) {
    const { data } = await (
      await createClient()
    )
      .from("notification_queue")
      .select("id, template_key, status, created_at, sent_at, payload")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    notifications = data ?? [];
  }
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-medium text-primary">Account</p>
        <h1 className="text-3xl font-bold">Notifications</h1>
        <p className="mt-1 text-muted-foreground">
          Delivery history for account and marketplace email notifications.
        </p>
      </header>
      {notifications.length ? (
        <div className="flex flex-col gap-3">
          {notifications.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {item.template_key.replace(/[._]/g, " ")}
                    </CardTitle>
                    <CardDescription>
                      {new Date(item.created_at).toLocaleString("en-MW")}
                    </CardDescription>
                  </div>
                  <Badge variant={item.status === "sent" ? "default" : "outline"}>
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {item.sent_at ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 aria-hidden="true" />
                    Sent {new Date(item.sent_at).toLocaleString("en-MW")}
                  </span>
                ) : (
                  "Queued for delivery"
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bell />
            </EmptyMedia>
            <EmptyTitle>No notifications yet</EmptyTitle>
            <EmptyDescription>
              Saved-search matches, viewing updates and account notices will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
