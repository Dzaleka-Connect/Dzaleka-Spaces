import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { formatMwk } from "@/lib/types";
import { listMyMaintenanceQuotes } from "@/lib/trades";

export const metadata: Metadata = {
  title: "Quote detail",
};

export default async function TradeQuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const { id } = await params;
  const quote = (await listMyMaintenanceQuotes(user.id)).find((q) => q.id === id);
  if (!quote) redirect("/trades/quotes");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">{quote.ticketTitle}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{formatMwk(quote.amountMwk)}</CardTitle>
          <CardDescription>Status: {quote.status}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Timeline: {quote.timeline ?? "Not provided"}
          </p>
          <p className="text-sm text-muted-foreground">
            {quote.notes ?? "No notes added."}
          </p>
          <Button
            variant="outline"
            render={<Link href="/trades/quotes" />}
            nativeButton={false}
          >
            Back to quotes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
