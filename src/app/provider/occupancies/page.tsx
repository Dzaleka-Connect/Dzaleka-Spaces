import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Info, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { OccupancyStatusBadge } from "@/components/occupancy-status-badge";
import { getSessionUser } from "@/lib/auth";
import { featureEnabled } from "@/lib/features";
import { listOccupanciesForProvider } from "@/lib/occupancies";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { billingPeriodShort, categoryLabel, formatMwk } from "@/lib/types";

export const metadata: Metadata = {
  title: "Occupancies",
};

export default async function ProviderOccupanciesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Occupancy records are available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const enabled = await featureEnabled("occupancy_records");
  const occupancies = enabled ? await listOccupanciesForProvider(user.id) : [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Occupancies</h1>
          <p className="mt-1 text-muted-foreground">
            Written records of who occupies your spaces and on what terms.
          </p>
        </div>
        {enabled ? (
          <Button render={<Link href="/provider/occupancies/new" />} nativeButton={false}>
            <Plus data-icon="inline-start" />
            New occupancy record
          </Button>
        ) : null}
      </div>

      {!enabled ? (
        <Alert>
          <Info />
          <AlertTitle>Occupancy records are switched off</AlertTitle>
          <AlertDescription>
            An administrator can enable the occupancy_records feature flag from the admin portal.
          </AlertDescription>
        </Alert>
      ) : occupancies.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No occupancy records yet</EmptyTitle>
            <EmptyDescription>
              When someone takes one of your spaces, create a record so both sides hold the same
              written terms.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {occupancies.map((o) => {
            const occupant = o.parties.find((p) => p.role === "occupant");
            return (
              <Card key={o.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <OccupancyStatusBadge status={o.status} />
                  </div>
                  <CardTitle className="text-base">
                    {categoryLabel(o.spaceCategory)} · {o.spaceZone}
                  </CardTitle>
                  <CardDescription>
                    {occupant?.fullName ?? "Occupant"} · {formatMwk(o.agreedAmountMwk)}/
                    {billingPeriodShort(o.billingPeriod)} · from {o.startDate}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/provider/occupancies/${o.id}`} />}
                    nativeButton={false}
                  >
                    Open record
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
