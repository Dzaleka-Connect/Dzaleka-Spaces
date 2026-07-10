import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { listSeekerEnquiries } from "@/lib/enquiries";
import { requireUser } from "@/lib/portal-auth";
import { listMyMaintenanceThreads } from "@/lib/trades";

export const metadata: Metadata = { title: "Messages" };

export default async function AccountMessagesPage() {
  const user = await requireUser();
  const [enquiries, maintenance] = await Promise.all([
    listSeekerEnquiries(user.id),
    listMyMaintenanceThreads(user.id),
  ]);
  const empty = enquiries.length === 0 && maintenance.length === 0;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-7 px-4 py-8 sm:px-6">
      <header>
        <p className="text-sm font-medium text-primary">Account</p>
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="mt-1 text-muted-foreground">
          Listing enquiries and maintenance conversations in one place.
        </p>
      </header>
      {empty ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquare />
            </EmptyMedia>
            <EmptyTitle>No conversations</EmptyTitle>
            <EmptyDescription>
              Conversations begin when you enquire about a listing or report a maintenance issue.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
      {enquiries.length ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Space enquiries</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {enquiries.map((item) => (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-base">Listing enquiry</CardTitle>
                  <CardDescription>
                    {new Date(item.created_at).toLocaleDateString("en-MW")} · {item.status}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/account/enquiries/${item.id}`} />}
                    nativeButton={false}
                  >
                    Open conversation
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
      {maintenance.length ? (
        <section>
          <h2 className="mb-3 text-xl font-semibold">Maintenance</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {maintenance.map((item) => (
              <Card key={item.ticketId}>
                <CardHeader>
                  <CardTitle className="text-base">{item.ticketTitle}</CardTitle>
                  <CardDescription>{item.lastBody || "No messages yet"}</CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/account/maintenance/${item.ticketId}`} />}
                    nativeButton={false}
                  >
                    Open request
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
