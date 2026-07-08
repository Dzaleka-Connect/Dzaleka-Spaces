import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMaintenanceJob } from "@/lib/trades";

export const metadata: Metadata = {
  title: "Maintenance job",
};

export default async function TradeJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getMaintenanceJob(id);
  if (!job) notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
        <p className="mt-1 text-muted-foreground">
          {job.zone ?? "Zone not listed"} ·{" "}
          {job.landmark ?? "Landmark shared after assignment"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{job.category}</Badge>
            <Badge>{job.status}</Badge>
            <Badge variant={job.priority === "urgent" ? "destructive" : "secondary"}>
              {job.priority}
            </Badge>
          </div>
          <CardTitle>Job brief</CardTitle>
          <CardDescription>
            Exact work locations are released only after assignment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed">{job.description}</p>
          <Button
            render={<Link href={`/trades/quotes/new?ticketId=${job.id}`} />}
            nativeButton={false}
          >
            Submit quote
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
