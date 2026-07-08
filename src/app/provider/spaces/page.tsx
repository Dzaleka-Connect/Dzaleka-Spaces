import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building, Info, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, facilityLabel } from "@/lib/types";

export const metadata: Metadata = {
  title: "My spaces",
};

export default async function ProviderSpacesPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Space management is available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const supabase = await createClient();
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [{ data: spaces }, { data: listings }] = await Promise.all([
    supabase
      .from("spaces")
      .select("id, category, landmark, facilities, rooms, capacity, created_at, zones(name)")
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("listings")
      .select("id, space_id, status")
      .order("created_at", { ascending: false }),
  ]);

  const listingBySpace = new Map<string, string>();
  for (const l of listings ?? []) {
    if (!listingBySpace.has(l.space_id)) listingBySpace.set(l.space_id, l.status);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My spaces</h1>
          <p className="mt-1 text-muted-foreground">
            The physical spaces you manage. A space keeps its history even when
            its listing changes.
          </p>
        </div>
        <Button render={<Link href="/list-a-space" />} nativeButton={false}>
          <Plus data-icon="inline-start" />
          Add space
        </Button>
      </div>

      {(spaces ?? []).length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building />
            </EmptyMedia>
            <EmptyTitle>No spaces yet</EmptyTitle>
            <EmptyDescription>
              Submit your first space — it appears here with its listing
              status.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Zone · landmark</TableHead>
              <TableHead>Facilities</TableHead>
              <TableHead>Listing status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(spaces ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">
                  {categoryLabel(s.category)}
                </TableCell>
                <TableCell>
                  {(s.zones as any)?.name} · {s.landmark}
                </TableCell>
                <TableCell className="max-w-48">
                  <span className="text-muted-foreground">
                    {(s.facilities ?? [])
                      .slice(0, 3)
                      .map((f: string) => facilityLabel(f))
                      .join(", ") || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {(listingBySpace.get(s.id) ?? "no listing").replace(/_/g, " ")}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
