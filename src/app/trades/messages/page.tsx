import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const metadata: Metadata = {
  title: "Trade messages",
};

export default function TradeMessagesPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Trade messages</h1>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageSquare />
          </EmptyMedia>
          <EmptyTitle>No maintenance message threads</EmptyTitle>
          <EmptyDescription>
            Maintenance conversations are attached to jobs and work orders.
          </EmptyDescription>
        </EmptyHeader>
        <Button
          variant="outline"
          render={<Link href="/trades/jobs" />}
          nativeButton={false}
        >
          Open jobs
        </Button>
      </Empty>
    </div>
  );
}
