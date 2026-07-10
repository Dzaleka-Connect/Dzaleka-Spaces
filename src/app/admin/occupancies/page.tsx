import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OccupancyStatusBadge } from "@/components/occupancy-status-badge";
import { canModerate, getSessionUser } from "@/lib/auth";
import type { OccupancyStatus } from "@/lib/occupancies";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, formatMwk } from "@/lib/types";

export const metadata: Metadata = {
  title: "Occupancies",
};

export default async function AdminOccupanciesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Occupancy administration is available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!canModerate(user)) redirect("/account");

  const supabase = await createClient();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: occupancies } = await supabase
    .from("occupancies")
    .select(
      "id, status, start_date, agreed_amount_mwk, billing_period, created_at, spaces(category, zones(name)), occupancy_parties(role, full_name, confirmed_at)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Occupancies</h1>
        <p className="mt-1 text-muted-foreground">
          Read-only oversight of occupancy records. Access is limited and audited; the parties
          themselves manage their records.
        </p>
      </div>

      {(occupancies ?? []).length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No occupancy records yet</EmptyTitle>
            <EmptyDescription>
              Records appear as providers document arrangements with occupants.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Space</TableHead>
              <TableHead>Occupant</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Start</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(occupancies ?? []).map((o) => {
              const space = o.spaces as any;
              const parties = (o.occupancy_parties ?? []) as any[];
              const occupant = parties.find((p) => p.role === "occupant");
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">
                    {categoryLabel(space?.category)} · {space?.zones?.name}
                  </TableCell>
                  <TableCell>
                    {occupant?.full_name ?? "—"}
                    {occupant?.confirmed_at ? (
                      <span className="ml-1 text-xs text-muted-foreground">(confirmed)</span>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {formatMwk(o.agreed_amount_mwk)}/{o.billing_period === "daily" ? "day" : "mo"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{o.start_date}</TableCell>
                  <TableCell>
                    <OccupancyStatusBadge status={o.status as OccupancyStatus} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
