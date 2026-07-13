import Link from "next/link";
import { CheckCircle2, CircleDashed, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OccupancyRecord } from "@/lib/occupancies";
import { billingPeriodUnit, categoryLabel, formatMwk } from "@/lib/types";

export function OccupancyTerms({ occupancy }: { occupancy: OccupancyRecord }) {
  const rows: [string, string][] = [
    [
      "Space",
      `${categoryLabel(occupancy.spaceCategory)} · ${occupancy.spaceZone} · ${occupancy.spaceLandmark}`,
    ],
    [
      "Agreed amount",
      `${formatMwk(occupancy.agreedAmountMwk)} per ${billingPeriodUnit(occupancy.billingPeriod)}`,
    ],
    ["Deposit", occupancy.depositAmountMwk ? formatMwk(occupancy.depositAmountMwk) : "None"],
    ["Start date", occupancy.startDate],
    ["Expected end", occupancy.expectedEndDate ?? "Open-ended"],
    ["Payment due day", occupancy.paymentDueDay ? `Day ${occupancy.paymentDueDay}` : "Not set"],
    [
      "Notice period",
      occupancy.noticePeriodDays != null ? `${occupancy.noticePeriodDays} days` : "Not set",
    ],
    ["Included services", occupancy.includedServices ?? "None recorded"],
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <CardTitle>Agreed terms</CardTitle>
          <CardDescription>
            This record documents the arrangement. It does not create or transfer ownership of land
            or property.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/spaces/occupancy/${occupancy.id}/print`} />}
          nativeButton={false}
          className="shrink-0 gap-2"
        >
          <Printer className="size-4" />
          <span>Print / PDF</span>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {occupancy.notes ? (
          <>
            <Separator />
            <div className="text-sm">
              <p className="text-muted-foreground">Basic conditions</p>
              <p className="mt-1">{occupancy.notes}</p>
            </div>
          </>
        ) : null}
        <Separator />
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-muted-foreground">Parties</p>
          {occupancy.parties.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              {p.confirmedAt ? (
                <CheckCircle2 className="size-4 text-primary" />
              ) : (
                <CircleDashed className="size-4 text-muted-foreground" />
              )}
              <span className="font-medium">{p.fullName}</span>
              <span className="text-muted-foreground">
                ({p.role}
                {p.confirmedAt
                  ? `, confirmed ${
                      p.confirmationMethod === "in_person"
                        ? "in person"
                        : p.confirmationMethod === "staff_assisted"
                          ? "with staff assistance"
                          : "in app"
                    }`
                  : ", not yet confirmed"}
                )
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
