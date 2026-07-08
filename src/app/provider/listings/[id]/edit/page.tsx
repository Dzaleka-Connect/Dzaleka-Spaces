import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Info, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSessionUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { updateProviderListing } from "./actions";

export const metadata: Metadata = {
  title: "Edit listing",
};

const billingItems = [
  { label: "Monthly", value: "monthly" },
  { label: "Daily", value: "daily" },
];

export default async function EditProviderListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  const { id } = await params;
  const status = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <Alert>
          <Info />
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            Listing edits are available once Supabase is connected.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, price_mwk, deposit_mwk, billing_period, available_from")
    .eq("id", id)
    .maybeSingle();

  if (!listing) redirect("/provider/listings");
  const action = updateProviderListing.bind(null, id);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit listing</h1>
        <p className="mt-1 text-muted-foreground">
          Changes may require review before public publication.
        </p>
      </div>

      {status.error ? (
        <Alert variant="destructive">
          <Info />
          <AlertTitle>Listing not saved</AlertTitle>
          <AlertDescription>{status.error}</AlertDescription>
        </Alert>
      ) : null}
      {status.saved ? (
        <Alert>
          <Save />
          <AlertTitle>Listing saved</AlertTitle>
          <AlertDescription>Your listing details were updated.</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Listing details</CardTitle>
          <CardDescription>
            This edits the advertisement, not the underlying space record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="title">Title</FieldLabel>
                <Input id="title" name="title" required defaultValue={listing.title} />
              </Field>
              <Field>
                <FieldLabel htmlFor="price">Amount (MWK)</FieldLabel>
                <Input
                  id="price"
                  name="priceMwk"
                  type="number"
                  min={0}
                  required
                  defaultValue={listing.price_mwk}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="deposit">Deposit (MWK)</FieldLabel>
                <Input
                  id="deposit"
                  name="depositMwk"
                  type="number"
                  min={0}
                  defaultValue={listing.deposit_mwk ?? ""}
                />
              </Field>
              <Field>
                <FieldLabel>Billing period</FieldLabel>
                <Select
                  name="billingPeriod"
                  items={billingItems}
                  defaultValue={listing.billing_period}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {billingItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="available">Available from</FieldLabel>
                <Input
                  id="available"
                  name="availableFrom"
                  type="date"
                  defaultValue={listing.available_from ?? ""}
                />
              </Field>
              <Button type="submit">
                <Save data-icon="inline-start" />
                Save listing
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
