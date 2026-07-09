import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { ListSpaceForm } from "@/components/list-space-form";
import { getZones } from "@/lib/zones";

export const metadata: Metadata = {
  title: "List a space",
};

export default async function ListASpacePage() {
  const zones = await getZones();
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">List a space</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Tell us about the shop, office, venue, workshop, storage or homestay
          you manage. Include clear photos — every listing is checked in person
          before it is published.
        </p>
        <Link
          href="/help/provider-guide"
          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <BookOpen className="size-4" />
          Read the full provider guide first
        </Link>
      </div>
      <div className="grid gap-4 rounded-xl border bg-muted/40 p-5 text-base sm:grid-cols-2">
        <div>
          <h2 className="mb-1 text-lg font-medium">Who may submit</h2>
          <p className="text-muted-foreground">
            Anyone who currently manages a space or is authorised to offer it —
            venue operators, organisation managers, family representatives and
            authorised agents. You state this basis in the form; a field
            representative checks it during the verification visit.
          </p>
        </div>
        <div>
          <h2 className="mb-1 text-lg font-medium">What is not allowed</h2>
          <p className="text-muted-foreground">
            Land sales, shelter sales presented as ownership, listings for
            spaces you are not authorised to offer, and discriminatory
            conditions. Residential room listings open later under a separate
            pilot.
          </p>
        </div>
      </div>
      <ListSpaceForm zones={zones} />
    </div>
  );
}
