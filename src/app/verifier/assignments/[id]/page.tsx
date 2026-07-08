import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, MapPin } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "@/components/photo-upload";
import { getSessionUser, isStaff } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { categoryLabel, facilityLabel, formatMwk } from "@/lib/types";
import { CHECKLIST_ITEMS, RECOMMENDATIONS } from "@/lib/verification";
import { submitChecklist } from "@/app/verifier/actions";

export const metadata: Metadata = {
  title: "Verification assignment",
};

export default async function AssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/verifier/assignments");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  if (!isStaff(user)) redirect("/account");

  const { id } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select(
      "id, title, price_mwk, deposit_mwk, billing_period, status, spaces(id, category, landmark, description, facilities, rooms, capacity, zones(name))"
    )
    .eq("id", id)
    .maybeSingle();

  if (!listing) notFound();

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const space = listing.spaces as any;
  const { data: internal } = await supabase
    .from("space_internal")
    .select("authority_basis, authority_notes, exact_location")
    .eq("space_id", space?.id)
    .maybeSingle();

  const submitAction = submitChecklist.bind(null, listing.id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{categoryLabel(space?.category)}</Badge>
          <Badge variant="secondary">
            {String(listing.status).replace(/_/g, " ")}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{listing.title}</h1>
        <p className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="size-4" />
          {space?.zones?.name} · {space?.landmark}
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Could not submit checklist</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Listing details to confirm on site</CardTitle>
          <CardDescription>
            Price {formatMwk(listing.price_mwk)}/
            {listing.billing_period === "daily" ? "day" : "month"}
            {listing.deposit_mwk
              ? ` · Deposit ${formatMwk(listing.deposit_mwk)}`
              : " · No deposit"}
            {space?.rooms ? ` · ${space.rooms} room(s)` : ""}
            {space?.capacity ? ` · capacity ${space.capacity}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>{space?.description}</p>
          {space?.facilities?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {space.facilities.map((f: string) => (
                <Badge key={f} variant="outline">
                  {facilityLabel(f)}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="font-medium">Stated authority (internal)</p>
            <p className="text-muted-foreground">
              {internal?.authority_basis
                ? String(internal.authority_basis).replace(/_/g, " ")
                : "No authority record — the reviewer cannot publish without one."}
            </p>
            {internal?.authority_notes ? (
              <p className="mt-1 text-muted-foreground">
                {internal.authority_notes}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field checklist</CardTitle>
          <CardDescription>
            Complete during the visit. You collect evidence — a separate
            reviewer approves or rejects publication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={submitAction}>
            <FieldGroup>
              <FieldSet>
                <FieldLegend>Checks</FieldLegend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {CHECKLIST_ITEMS.map((item) => (
                    <div key={item.key} className="flex items-center gap-2">
                      <Checkbox id={item.key} name={item.key} />
                      <FieldLabel
                        htmlFor={item.key}
                        className="font-normal"
                      >
                        {item.label}
                      </FieldLabel>
                    </div>
                  ))}
                </div>
              </FieldSet>

              <FieldSet>
                <FieldLegend>Recommendation</FieldLegend>
                <div className="flex flex-col gap-2">
                  {RECOMMENDATIONS.map((r, i) => (
                    <div key={r.value} className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`rec-${r.value}`}
                        name="recommendation"
                        value={r.value}
                        defaultChecked={i === 0}
                        className="size-4 accent-primary"
                      />
                      <FieldLabel
                        htmlFor={`rec-${r.value}`}
                        className="font-normal"
                      >
                        {r.label}
                      </FieldLabel>
                    </div>
                  ))}
                </div>
              </FieldSet>

              <Field>
                <FieldLabel htmlFor="safety_notes">
                  Safety concerns (if any)
                </FieldLabel>
                <Textarea id="safety_notes" name="safety_notes" />
              </Field>
              <Field>
                <FieldLabel htmlFor="notes">Notes for the reviewer</FieldLabel>
                <Textarea id="notes" name="notes" />
                <FieldDescription>
                  Notes are internal and never shown publicly.
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit">Submit checklist</Button>
              </Field>
            </FieldGroup>
          </form>
          {space?.id ? (
            <div className="mt-6 border-t pt-6">
              <PhotoUpload
                spaceId={space.id}
                bucket="verification-private"
                isPublic={false}
                label="Field evidence photos"
                description="Private photos for the review team. GPS metadata is removed before upload."
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
