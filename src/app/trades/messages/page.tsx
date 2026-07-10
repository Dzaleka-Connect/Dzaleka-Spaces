import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSessionUser } from "@/lib/auth";
import { listMyMaintenanceThreads } from "@/lib/trades";

export const metadata: Metadata = {
  title: "Trade messages",
};

export default async function TradeMessagesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const threads = await listMyMaintenanceThreads(user.id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Trade messages</h1>
        <p className="mt-1 text-muted-foreground">
          Conversations on jobs you requested or were assigned.
        </p>
      </div>

      {threads.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquare />
            </EmptyMedia>
            <EmptyTitle>No maintenance threads</EmptyTitle>
            <EmptyDescription>
              Messages appear after you are linked to a maintenance job as requester or assigned
              service provider.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" render={<Link href="/trades/jobs" />} nativeButton={false}>
            Open jobs
          </Button>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.map((thread) => (
            <li key={thread.ticketId}>
              <Link
                href={`/trades/messages/${thread.ticketId}`}
                className="flex flex-col gap-2 rounded-lg border p-4 hover:bg-muted/40"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{thread.ticketTitle}</p>
                  <Badge variant="outline">{thread.status}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {thread.lastBody ?? "No messages yet"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {thread.messageCount} message
                  {thread.messageCount === 1 ? "" : "s"}
                  {thread.lastMessageAt
                    ? ` · ${new Date(thread.lastMessageAt).toLocaleString()}`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
