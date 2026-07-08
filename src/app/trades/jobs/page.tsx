import type { Metadata } from "next";
import Link from "next/link";
import { BriefcaseBusiness, SearchX } from "lucide-react";
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
import { listOpenMaintenanceJobs } from "@/lib/trades";

export const metadata: Metadata = {
  title: "Maintenance jobs",
};

export default async function TradesJobsPage() {
  const jobs = await listOpenMaintenanceJobs();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Maintenance jobs</h1>
        <p className="mt-1 text-muted-foreground">
          Open work opportunities visible to approved maintenance providers.
        </p>
      </div>

      {jobs.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>No open jobs</EmptyTitle>
            <EmptyDescription>
              New repair and service requests will appear here when they are
              ready for quotes.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{job.title}</CardTitle>
                  <Badge variant="outline">{job.category}</Badge>
                  <Badge variant={job.priority === "urgent" ? "destructive" : "secondary"}>
                    {job.priority}
                  </Badge>
                </div>
                <CardDescription>
                  {job.zone ?? "Zone not listed"} ·{" "}
                  {job.landmark ?? "Landmark shared after assignment"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {job.description}
                </p>
                <Button
                  size="sm"
                  render={<Link href={`/trades/jobs/${job.id}`} />}
                  nativeButton={false}
                >
                  <BriefcaseBusiness data-icon="inline-start" />
                  Review job
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
