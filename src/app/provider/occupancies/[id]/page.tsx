import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OccupancyStatusBadge } from "@/components/occupancy-status-badge";
import { OccupancyTerms } from "@/components/occupancy-terms";
import { ProviderOccupancyActions } from "@/components/occupancy-actions";
import { getSessionUser } from "@/lib/auth";
import { getOccupancyForUser } from "@/lib/occupancies";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Occupancy record",
};

export default async function OccupancyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!isSupabaseConfigured()) redirect("/provider/occupancies");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const { id } = await params;
  const occupancy = await getOccupancyForUser(id, user.id);
  if (!occupancy) notFound();

  const occupant = occupancy.parties.find((p) => p.role === "occupant");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <div>
          <OccupancyStatusBadge status={occupancy.status} />
        </div>
        <h1 className="text-2xl font-bold">Occupancy record</h1>
        <p className="text-muted-foreground">
          Created {new Date(occupancy.createdAt).toLocaleDateString()}
          {occupancy.activatedAt
            ? ` · active since ${new Date(occupancy.activatedAt).toLocaleDateString()}`
            : ""}
        </p>
      </div>

      <OccupancyTerms occupancy={occupancy} />

      {occupancy.providerId === user.id ? (
        <ProviderOccupancyActions
          occupancyId={occupancy.id}
          status={occupancy.status}
          occupantHasAccount={Boolean(occupant?.userId)}
          occupantConfirmed={Boolean(occupant?.confirmedAt)}
        />
      ) : null}
    </div>
  );
}
