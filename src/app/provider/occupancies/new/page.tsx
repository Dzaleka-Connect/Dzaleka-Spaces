import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OccupancyForm, type EnquirerOption, type SpaceOption } from "@/components/occupancy-form";
import { getSessionUser } from "@/lib/auth";
import { featureEnabled } from "@/lib/features";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel } from "@/lib/types";

export const metadata: Metadata = {
  title: "New occupancy record",
};

export default async function NewOccupancyPage() {
  if (!isSupabaseConfigured()) redirect("/provider/occupancies");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  if (!(await featureEnabled("occupancy_records"))) {
    redirect("/provider/occupancies");
  }

  const supabase = await createClient();
  const { data: spaceRows } = await supabase
    .from("spaces")
    .select("id, category, landmark, zones(name)")
    .eq("provider_id", user.id)
    .order("created_at", { ascending: false });

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const spaces: SpaceOption[] = (spaceRows ?? []).map((s) => ({
    id: s.id,
    label: `${categoryLabel(s.category)} · ${(s.zones as any)?.name ?? ""} · ${s.landmark}`,
  }));

  // Seekers with accounts who enquired on this provider's listings can be
  // linked so they confirm the record from their own account.
  const spaceIds = (spaceRows ?? []).map((s) => s.id);
  let enquirers: EnquirerOption[] = [];
  if (spaceIds.length) {
    const { data: listings } = await supabase
      .from("listings")
      .select("id")
      .in("space_id", spaceIds);
    const listingIds = (listings ?? []).map((l) => l.id);
    if (listingIds.length) {
      const { data: enquiries } = await supabase
        .from("enquiries")
        .select("seeker_id, name")
        .in("listing_id", listingIds)
        .not("seeker_id", "is", null);
      const seen = new Map<string, string>();
      for (const e of enquiries ?? []) {
        if (e.seeker_id && !seen.has(e.seeker_id)) {
          seen.set(e.seeker_id, e.name);
        }
      }
      enquirers = [...seen.entries()].map(([userId, label]) => ({
        userId,
        label,
      }));
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">New occupancy record</h1>
        <p className="mt-1 text-muted-foreground">
          Document the arrangement so both sides hold the same written terms.
        </p>
      </div>

      {spaces.length === 0 ? (
        <Alert>
          <Info />
          <AlertTitle>No spaces yet</AlertTitle>
          <AlertDescription>
            Submit a space first — occupancy records are attached to a space you manage.
          </AlertDescription>
        </Alert>
      ) : (
        <OccupancyForm spaces={spaces} enquirers={enquirers} />
      )}
    </div>
  );
}
