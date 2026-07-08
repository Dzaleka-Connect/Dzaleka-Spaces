import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, BriefcaseBusiness, Wrench } from "lucide-react";
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
import { listServiceProviders } from "@/lib/trades";

export const metadata: Metadata = {
  title: "Maintenance services",
};

export default async function TradesPage() {
  const providers = await listServiceProviders();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Maintenance services
          </h1>
          <p className="mt-1 text-muted-foreground">
            Find approved local repair, cleaning, solar and building-service
            providers. Exact work locations are shared only after assignment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            render={<Link href="/trades/jobs" />}
            nativeButton={false}
          >
            <BriefcaseBusiness data-icon="inline-start" />
            Jobs
          </Button>
          <Button render={<Link href="/trades/profile" />} nativeButton={false}>
            <Wrench data-icon="inline-start" />
            Trade profile
          </Button>
        </div>
      </div>

      {providers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wrench />
            </EmptyMedia>
            <EmptyTitle>No active service providers</EmptyTitle>
            <EmptyDescription>
              Approved maintenance profiles will appear here when they are
              active.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <Card key={provider.userId}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>{provider.displayName}</CardTitle>
                  {provider.verifiedAt ? (
                    <Badge variant="secondary">
                      <BadgeCheck />
                      Verified contact
                    </Badge>
                  ) : null}
                </div>
                <CardDescription>
                  {provider.bio ?? "No public service description yet."}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {provider.categories.map((category) => (
                    <Badge key={category} variant="outline">
                      {category}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Zones:{" "}
                  {provider.zonesServed.length
                    ? provider.zonesServed.join(", ")
                    : "By arrangement"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Languages:{" "}
                  {provider.languages.length
                    ? provider.languages.join(", ")
                    : "Not listed"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
