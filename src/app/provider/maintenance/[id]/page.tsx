import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, MessageSquare, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/auth-roles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { formatMwk } from "@/lib/types";
import { listMaintenanceMessages } from "@/lib/trades";
import { MaintenanceThread } from "@/components/maintenance-thread";

export const metadata: Metadata = {
  title: "Coordinate Repair",
};

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProviderTicketDetailPage({ params }: TicketDetailPageProps) {
  if (!isSupabaseConfigured()) {
    redirect("/provider");
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const supabase = await createClient();

  // Fetch ticket details ensuring provider owns space
  const { data: ticket } = await supabase
    .from("maintenance_tickets")
    .select("*, spaces!inner(landmark, zones(name), provider_id)")
    .eq("id", id)
    .single();

  if (!ticket || ticket.spaces?.provider_id !== user.id) {
    notFound();
  }

  // Fetch quotes
  const { data: quotes } = await supabase
    .from("maintenance_quotes")
    .select("*, service_provider_profiles(display_name)")
    .eq("ticket_id", id);

  // Fetch active work order (if assigned)
  const { data: workOrder } = await supabase
    .from("maintenance_work_orders")
    .select("*")
    .eq("ticket_id", id)
    .maybeSingle();

  const messages = await listMaintenanceMessages(id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <Button variant="ghost" size="sm" render={<Link href="/provider/maintenance" />} nativeButton={false}>
          <ArrowLeft className="mr-2 size-4" />
          Back to repairs
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{ticket.title}</h1>
          <p className="mt-1 text-muted-foreground text-sm flex items-center gap-2">
            <Clock className="size-4" />
            Reported on {new Date(ticket.created_at).toLocaleDateString()} · Status:{" "}
            <span className="font-semibold capitalize text-primary">{ticket.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={ticket.priority === "urgent" ? "destructive" : "secondary"} className="text-sm py-1 px-3">
            {ticket.priority} priority
          </Badge>
          <Badge variant="outline" className="text-sm py-1 px-3">
            {ticket.category}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_380px]">
        {/* Left Side: Details and Thread */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              <div className="border-t pt-4 text-xs text-muted-foreground space-y-1">
                <p>Space Location: <span className="font-medium text-foreground">{ticket.spaces?.landmark} ({ticket.spaces?.zones?.name})</span></p>
              </div>
            </CardContent>
          </Card>

          {/* Discussion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5" />
                Discussion Thread
              </CardTitle>
              <CardDescription>Coordinate with tenant or assigned service provider.</CardDescription>
            </CardHeader>
            <CardContent>
              <MaintenanceThread ticketId={id} initialMessages={messages} viewerRole={isStaff(user) ? "staff" : "requester"} />
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Quotes and Assignments */}
        <div className="space-y-6">
          {workOrder ? (
            <Card className="border-success/30 bg-success/5">
              <CardHeader>
                <CardTitle className="text-success flex items-center gap-2">
                  <Wrench className="size-5" />
                  Assigned Work Order
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <p>Status: <Badge className="ml-1 capitalize">{workOrder.status}</Badge></p>
                {workOrder.scheduled_for && (
                  <p>Scheduled For: <span className="font-semibold">{new Date(workOrder.scheduled_for).toLocaleString()}</span></p>
                )}
                {workOrder.completion_notes && (
                  <div className="border-t pt-2">
                    <p className="font-semibold">Completion Notes:</p>
                    <p className="text-xs italic mt-1 bg-background p-2 rounded border">&quot;{workOrder.completion_notes}&quot;</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Quotes Offered</CardTitle>
                <CardDescription>Tenant will choose and approve quotes here to authorize repairs.</CardDescription>
              </CardHeader>
              <CardContent>
                {quotes?.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Awaiting quotes from local service providers.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {quotes?.map((q) => (
                      <div key={q.id} className="border rounded-xl p-4 space-y-2 bg-muted/10">
                        <div className="flex items-center justify-between border-b pb-2">
                          <span className="font-bold text-sm">
                            {((q as unknown as { service_provider_profiles?: { display_name?: string | null } | null }).service_provider_profiles?.display_name) ?? "Tradesperson"}
                          </span>
                          <span className="font-bold text-primary text-sm">{formatMwk(q.amount_mwk)}</span>
                        </div>
                        {q.timeline && <p className="text-xs">Timeline: <span className="font-semibold">{q.timeline}</span></p>}
                        {q.notes && <p className="text-xs text-muted-foreground italic">&quot;{q.notes}&quot;</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
