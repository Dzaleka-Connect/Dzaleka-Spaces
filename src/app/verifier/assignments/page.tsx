import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, ClipboardList, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSessionUser, isStaff } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, formatMwk } from "@/lib/types";

export const metadata: Metadata = {
  title: "Verification assignments",
};

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            The verifier app is available once a Supabase project is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!isStaff(user)) redirect("/account");

  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("verification_assignments")
    .select(
      "id, status, due_at, listing_id, listings(id, title, price_mwk, billing_period, status, spaces(category, landmark, zone_id, zones(name)))"
    )
    .eq("verifier_id", user.id)
    .in("status", ["assigned", "downloaded", "in_progress"])
    .order("due_at", { ascending: true });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">Verification assignments</h1>
        <p className="mt-1 text-muted-foreground">
          Listings awaiting an in-person field visit. You collect evidence; a reviewer decides
          publication.
        </p>
      </div>

      {submitted ? (
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Checklist submitted</AlertTitle>
          <AlertDescription>
            Your field checklist was recorded and is awaiting a reviewer decision.
          </AlertDescription>
        </Alert>
      ) : null}

      {(pending ?? []).length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>No assignments</EmptyTitle>
            <EmptyDescription>
              There are no listings awaiting verification right now.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(pending ?? []).map((assignment) => {
            /* eslint-disable @typescript-eslint/no-explicit-any */
            const l = assignment.listings as any;
            const space = l.spaces as any;
            return (
              <Card key={assignment.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{categoryLabel(space?.category)}</Badge>
                    <Badge variant="secondary">{l.status.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline">
                      Due {new Date(assignment.due_at).toLocaleDateString("en-MW")}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{l.title}</CardTitle>
                  <CardDescription>
                    {space?.zones?.name} · {space?.landmark} · {formatMwk(l.price_mwk)}/
                    {l.billing_period === "daily" ? "day" : "mo"}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button
                    size="sm"
                    render={<Link href={`/verifier/assignments/${assignment.id}`} />}
                    nativeButton={false}
                  >
                    Open assignment
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
