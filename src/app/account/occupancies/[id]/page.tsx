import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OccupancyStatusBadge } from "@/components/occupancy-status-badge";
import { OccupancyTerms } from "@/components/occupancy-terms";
import { getOccupancyForUser } from "@/lib/occupancies";
import {
  getOccupancyBalance,
  listChargesForOccupancy,
  listPaymentsForOccupancy,
} from "@/lib/payments";
import { requireUser } from "@/lib/portal-auth";
import { formatMwk } from "@/lib/types";

export const metadata: Metadata = { title: "Occupancy details" };

export default async function AccountOccupancyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const occupancy = await getOccupancyForUser((await params).id, user.id);
  if (!occupancy) notFound();
  const [charges, payments, balance] = await Promise.all([
    listChargesForOccupancy(occupancy.id),
    listPaymentsForOccupancy(occupancy.id),
    getOccupancyBalance(occupancy.id),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header>
        <OccupancyStatusBadge status={occupancy.status} />
        <h1 className="mt-2 text-3xl font-bold">
          {occupancy.spaceZone} · {occupancy.spaceLandmark}
        </h1>
        <p className="mt-1 text-muted-foreground">Occupancy terms, balance and record history.</p>
      </header>
      <OccupancyTerms occupancy={occupancy} />
      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Outstanding balance</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMwk(balance.balanceMwk)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Charges</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{charges.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payment records</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{payments.length}</CardContent>
        </Card>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" render={<Link href="/account/charges" />} nativeButton={false}>
          View charges
        </Button>
        <Button variant="outline" render={<Link href="/account/payments" />} nativeButton={false}>
          View payments
        </Button>
        <Button render={<Link href="/account/maintenance/new" />} nativeButton={false}>
          Report maintenance
        </Button>
      </div>
    </div>
  );
}
