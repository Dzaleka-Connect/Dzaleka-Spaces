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
import { OccupantConfirmButton } from "@/components/occupancy-actions";
import { OccupancyStatusBadge } from "@/components/occupancy-status-badge";
import { OccupancyTerms } from "@/components/occupancy-terms";
import { getSessionUser } from "@/lib/auth";
import { listOccupanciesForOccupant } from "@/lib/occupancies";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "My occupancy",
};

export default async function AccountOccupancyPage() {
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

  const occupancies = await listOccupanciesForOccupant(user.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">My occupancy</h1>
        <p className="mt-1 text-muted-foreground">
          Written records of arrangements where you are the occupant.
        </p>
      </div>

      {occupancies.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No occupancy records</EmptyTitle>
            <EmptyDescription>
              When a provider records an arrangement with you, it appears here for you to review and
              confirm.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {occupancies.map((o) => {
            const myParty = o.parties.find((p) => p.userId === user.id && p.role === "occupant");
            return (
              <div key={o.id} className="flex flex-col gap-4">
                <div>
                  <OccupancyStatusBadge status={o.status} />
                </div>
                <OccupancyTerms occupancy={o} />
                {o.status === "awaiting_occupant_confirmation" &&
                myParty &&
                !myParty.confirmedAt ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      Check every term above before confirming. Only confirm once you have viewed
                      the space and agree with what is written.
                    </p>
                    <div>
                      <OccupantConfirmButton occupancyId={o.id} />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
