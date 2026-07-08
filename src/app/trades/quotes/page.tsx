import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, SearchX } from "lucide-react";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSessionUser } from "@/lib/auth";
import { formatMwk } from "@/lib/types";
import { listMyMaintenanceQuotes } from "@/lib/trades";

export const metadata: Metadata = {
  title: "Trade quotes",
};

export default async function TradesQuotesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const quotes = await listMyMaintenanceQuotes(user.id);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
          <p className="mt-1 text-muted-foreground">
            Quotes you submitted for maintenance jobs.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/trades/jobs" />}
          nativeButton={false}
        >
          Open jobs
        </Button>
      </div>

      {quotes.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No quotes submitted</EmptyTitle>
            <EmptyDescription>
              Review open jobs and submit a quote when the work matches your
              service profile.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-3">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{quote.ticketTitle}</CardTitle>
                  <Badge variant="outline">{quote.status}</Badge>
                </div>
                <CardDescription>{formatMwk(quote.amountMwk)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {quote.timeline ?? "Timeline not provided"}
                </p>
                <Button
                  size="sm"
                  render={<Link href={`/trades/quotes/${quote.id}`} />}
                  nativeButton={false}
                >
                  <FileText data-icon="inline-start" />
                  Open quote
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
